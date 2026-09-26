import {
  Asset,
  BASE_FEE,
  Keypair,
  Operation,
  StrKey,
  Transaction,
  TransactionBuilder,
  rpc,
  xdr,
} from "@stellar/stellar-sdk";
import { stroopsToXlm, xlmToStroops } from "./amount";

/**
 * Stellar operations for disbursements. One account (WALLET_SOURCE_PRIVATE_KEY) is the
 * treasury: it holds the XLM, pays fees and sends payments to beneficiaries' Stellar accounts.
 */
export class StellarConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StellarConfigError";
  }
}

export type StellarNetworkConfig = {
  rpcUrl: string;
  networkPassphrase: string;
  source: Keypair;
};

export function getStellarNetworkConfig(): StellarNetworkConfig {
  // Server-only: an RPC URL can carry a provider API key, so it must never reach the browser
  const rpcUrl = process.env.STELLAR_RPC_URL;
  if (!rpcUrl) throw new StellarConfigError("STELLAR_RPC_URL is missing");
  const networkPassphrase = process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE;
  if (!networkPassphrase) {
    throw new StellarConfigError("NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE is missing");
  }

  let source: Keypair;
  try {
    source = Keypair.fromSecret(process.env.WALLET_SOURCE_PRIVATE_KEY ?? "");
  } catch {
    throw new StellarConfigError("WALLET_SOURCE_PRIVATE_KEY is missing or invalid");
  }
  return { rpcUrl, networkPassphrase, source };
}

/** A new Stellar account must start with at least this much XLM (network minimum balance). */
export const MIN_NEW_ACCOUNT_STROOPS = xlmToStroops("1");

/**
 * Where a failed transaction stands. "not_submitted" and "failed" moved no funds (safe to
 * retry); "unknown" was submitted but not confirmed, so it may still land and must not be
 * retried automatically.
 */
export type StellarTxOutcome = "not_submitted" | "failed" | "unknown";

export class StellarTxError extends Error {
  constructor(
    readonly outcome: StellarTxOutcome,
    message: string,
    readonly txHash?: string
  ) {
    super(message);
    this.name = "StellarTxError";
  }
}

/** Called with the transaction hash once signed, before it is submitted. */
export type OnSubmitting = (txHash: string) => Promise<void>;

function server(config: StellarNetworkConfig) {
  return new rpc.Server(config.rpcUrl, { allowHttp: config.rpcUrl.startsWith("http://") });
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/** The Stellar RPC could not be reached or gave no usable answer. */
export class StellarRpcError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StellarRpcError";
  }
}

/**
 * The account's ledger entry, or null when the network confirms it does not exist.
 *
 * Not rpc.Server.getAccountEntry: it reports every failure (an outage, a 503, a closed port)
 * as "Account not found", which would make an unreachable RPC look like a missing account.
 * getLedgerEntries throws the real error, and an answer for a missing account still carries
 * the ledger it was checked against.
 */
type AccountEntry = Extract<xdr.LedgerEntryData, { type: "account" }>["account"];

async function readAccountEntry(
  config: StellarNetworkConfig,
  account: string
): Promise<AccountEntry | null> {
  const key = xdr.LedgerKey.account(
    new xdr.LedgerKeyAccount({ accountId: Keypair.fromPublicKey(account).xdrPublicKey() })
  );
  let response: rpc.Api.GetLedgerEntriesResponse;
  try {
    response = await server(config).getLedgerEntries(key);
  } catch (error) {
    throw new StellarRpcError(`Stellar RPC unavailable: ${describe(error)}`);
  }
  if (!response || !Number.isInteger(response.latestLedger) || !Array.isArray(response.entries)) {
    throw new StellarRpcError("Stellar RPC gave an unexpected answer");
  }
  const entry = response.entries[0];
  if (!entry) return null;
  if (entry.val.type !== "account")
    throw new StellarRpcError("Stellar RPC returned a non-account entry");
  return entry.val.account;
}

/**
 * Whether the Stellar account exists (has been created and funded). Throws StellarRpcError
 * if the network cannot be checked, rather than guessing.
 */
export async function accountExists(config: StellarNetworkConfig, account: string) {
  return (await readAccountEntry(config, account)) !== null;
}

/** Signs as the treasury, records the hash, submits and waits for the result. */
async function submitAsSource(
  config: StellarNetworkConfig,
  label: string,
  build: () => Promise<Transaction>,
  onSubmitting?: OnSubmitting
): Promise<string> {
  const rpcServer = server(config);

  let transaction: Transaction;
  try {
    transaction = await build();
    transaction.sign(config.source);
  } catch (error) {
    throw new StellarTxError("not_submitted", `${label} could not be built: ${describe(error)}`);
  }

  // The hash is fixed once signed. Recording it before submitting means any payment that
  // might have landed can always be looked up later (see reconcileDisbursements).
  const hash = Buffer.from(transaction.hash()).toString("hex");
  if (onSubmitting) {
    try {
      await onSubmitting(hash);
    } catch (error) {
      throw new StellarTxError("not_submitted", `${label} not submitted: ${describe(error)}`);
    }
  }

  try {
    const sent = await rpcServer.sendTransaction(transaction);
    if (sent.status === "ERROR") throw new StellarTxError("failed", `${label} rejected`, hash);
    if (sent.status === "TRY_AGAIN_LATER") {
      throw new StellarTxError("not_submitted", `${label} not accepted, try again later`, hash);
    }
  } catch (error) {
    if (error instanceof StellarTxError) throw error;
    // A network error here could mean the node received it; treat as unknown to be safe
    throw new StellarTxError("unknown", `${label} submission failed: ${describe(error)}`, hash);
  }

  try {
    const result = await rpcServer.pollTransaction(hash, {
      attempts: 20,
      sleepStrategy: () => 1500,
    });
    if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) return hash;
    if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new StellarTxError("failed", `${label} failed on-chain`, hash);
    }
  } catch (error) {
    if (error instanceof StellarTxError) throw error;
  }
  throw new StellarTxError("unknown", `${label} not confirmed in time`, hash);
}

/**
 * Sends `stroops` of XLM from the treasury to the Stellar account `to`: a payment, or, if the
 * account does not exist yet, a createAccount (which needs at least 1 XLM).
 */
export async function sendXlm(
  config: StellarNetworkConfig,
  to: string,
  stroops: bigint,
  onSubmitting?: OnSubmitting
): Promise<string> {
  if (!StrKey.isValidEd25519PublicKey(to)) {
    throw new StellarTxError("not_submitted", `Not a Stellar account address: ${to}`);
  }
  const exists = await accountExists(config, to).catch((error) => {
    throw new StellarTxError("not_submitted", `Could not check ${to}: ${describe(error)}`);
  });
  if (!exists && stroops < MIN_NEW_ACCOUNT_STROOPS) {
    throw new StellarTxError(
      "not_submitted",
      `${to} does not exist yet; creating it needs at least ${stroopsToXlm(MIN_NEW_ACCOUNT_STROOPS)} XLM`
    );
  }

  const amount = stroopsToXlm(stroops);
  return submitAsSource(
    config,
    exists ? "payment" : "createAccount",
    async () => {
      const account = await server(config).getAccount(config.source.publicKey());
      return new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: config.networkPassphrase,
      })
        .addOperation(
          exists
            ? Operation.payment({ destination: to, asset: Asset.native(), amount })
            : Operation.createAccount({ destination: to, startingBalance: amount })
        )
        .setTimeout(60)
        .build();
    },
    onSubmitting
  );
}

/** The treasury's XLM balance in stroops. */
export async function getTreasuryBalance(config: StellarNetworkConfig): Promise<bigint> {
  const entry = await readAccountEntry(config, config.source.publicKey());
  if (!entry) throw new StellarConfigError("The treasury account does not exist on this network");
  return BigInt(entry.balance);
}

export type TransactionOutcome = "success" | "failed" | "not_found";

/**
 * Looks a submitted transaction up (the RPC only keeps recent history). "not_found" only when
 * the RPC says so: reconciliation may make a not-found payment redeemable again, so any other
 * answer throws instead.
 */
export async function getTransactionOutcome(
  config: StellarNetworkConfig,
  txHash: string
): Promise<TransactionOutcome> {
  const { status } = await server(config).getTransaction(txHash);
  if (status === rpc.Api.GetTransactionStatus.SUCCESS) return "success";
  if (status === rpc.Api.GetTransactionStatus.FAILED) return "failed";
  if (status === rpc.Api.GetTransactionStatus.NOT_FOUND) return "not_found";
  throw new StellarRpcError(`Stellar RPC gave an unexpected transaction status: ${String(status)}`);
}

/** The payment operations disbursements need, bound to a network config. */
export function stellarPaymentOps(config: StellarNetworkConfig = getStellarNetworkConfig()) {
  return {
    accountExists: (account: string) => accountExists(config, account),
    sendXlm: (to: string, stroops: bigint, onSubmitting?: OnSubmitting) =>
      sendXlm(config, to, stroops, onSubmitting),
    getTransactionOutcome: (txHash: string) => getTransactionOutcome(config, txHash),
  };
}
