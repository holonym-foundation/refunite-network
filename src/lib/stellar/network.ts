import {
  Address,
  Asset,
  BASE_FEE,
  Contract,
  Keypair,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import {
  StellarConfigError,
  StellarWalletConfig,
  getStellarWalletConfig,
  walletDeploySalt,
} from "./address";

/**
 * Stellar operations for disbursements, ported from Human-Wallet-On-Stellar (lib/tx_build,
 * lib/tx_send, api/wallet/deploy, api/wallet/redeem) to @stellar/stellar-sdk v17.
 *
 * One account (WALLET_SOURCE_PRIVATE_KEY) is the treasury: it pays fees, deploys wallets
 * through the factory and sends XLM through the native asset contract.
 */
export type StellarNetworkConfig = StellarWalletConfig & {
  rpcUrl: string;
  source: Keypair;
};

export function getStellarNetworkConfig(): StellarNetworkConfig {
  const rpcUrl = process.env.NEXT_PUBLIC_STELLAR_RPC_URL;
  if (!rpcUrl) throw new StellarConfigError("NEXT_PUBLIC_STELLAR_RPC_URL is missing");

  let source: Keypair;
  try {
    source = Keypair.fromSecret(process.env.WALLET_SOURCE_PRIVATE_KEY ?? "");
  } catch {
    throw new StellarConfigError("WALLET_SOURCE_PRIVATE_KEY is missing or invalid");
  }
  return { ...getStellarWalletConfig(), rpcUrl, source };
}

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

function server(config: StellarNetworkConfig) {
  return new rpc.Server(config.rpcUrl, { allowHttp: config.rpcUrl.startsWith("http://") });
}

function nativeTokenContractId(config: StellarNetworkConfig) {
  return Asset.native().contractId(config.networkPassphrase);
}

async function buildCall(
  config: StellarNetworkConfig,
  contractId: string,
  method: string,
  args: xdr.ScVal[]
) {
  const account = await server(config).getAccount(config.source.publicKey());
  return new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(new Contract(contractId).call(method, ...args))
    .setTimeout(60)
    .build();
}

/** Simulates, signs as the source account, submits and waits for the result. */
/** Called with the transaction hash once signed, before it is submitted. */
export type OnSubmitting = (txHash: string) => Promise<void>;

async function invokeAsSource(
  config: StellarNetworkConfig,
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  onSubmitting?: OnSubmitting
): Promise<string> {
  const rpcServer = server(config);

  let prepared;
  try {
    // Simulation fills in resources and auth; it throws if the call would fail
    prepared = await rpcServer.prepareTransaction(
      await buildCall(config, contractId, method, args)
    );
    prepared.sign(config.source);
  } catch (error) {
    throw new StellarTxError("not_submitted", `${method} simulation failed: ${describe(error)}`);
  }

  // The hash is fixed once signed. Recording it before submitting means any payment that
  // might have landed can always be looked up later (see reconcileDisbursements).
  const hash = Buffer.from(prepared.hash()).toString("hex");
  if (onSubmitting) {
    try {
      await onSubmitting(hash);
    } catch (error) {
      throw new StellarTxError("not_submitted", `${method} not submitted: ${describe(error)}`);
    }
  }

  try {
    const sent = await rpcServer.sendTransaction(prepared);
    if (sent.status === "ERROR") throw new StellarTxError("failed", `${method} rejected`, hash);
    if (sent.status === "TRY_AGAIN_LATER") {
      throw new StellarTxError("not_submitted", `${method} not accepted, try again later`, hash);
    }
  } catch (error) {
    if (error instanceof StellarTxError) throw error;
    // A network error here could mean the node received it; treat as unknown to be safe
    throw new StellarTxError("unknown", `${method} submission failed: ${describe(error)}`, hash);
  }

  try {
    const result = await rpcServer.pollTransaction(hash, {
      attempts: 20,
      sleepStrategy: () => 1500,
    });
    if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) return hash;
    if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new StellarTxError("failed", `${method} transaction failed on-chain`, hash);
    }
  } catch (error) {
    if (error instanceof StellarTxError) throw error;
  }
  throw new StellarTxError("unknown", `${method} transaction not confirmed in time`, hash);
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/** Whether a contract (e.g. a beneficiary's smart wallet) exists on the network. */
export async function walletExists(config: StellarNetworkConfig, contractId: string) {
  const { entries } = await server(config).getLedgerEntries(
    new Contract(contractId).getFootprint()
  );
  return entries.length > 0;
}

/** Deploys the smart wallet for `ethAddress` via the factory; returns the transaction hash. */
export async function deployWallet(config: StellarNetworkConfig, ethAddress: string) {
  const salt = walletDeploySalt(ethAddress, config);
  const ethBytes = salt.subarray(0, 20);
  return invokeAsSource(config, config.factoryContractId, "deploy", [
    xdr.ScVal.scvBytes(salt),
    xdr.ScVal.scvBytes(Buffer.from(ethBytes)),
  ]);
}

/** Sends `stroops` of XLM from the treasury to `to` (a contract or account address). */
export async function sendXlm(
  config: StellarNetworkConfig,
  to: string,
  stroops: bigint,
  onSubmitting?: OnSubmitting
) {
  return invokeAsSource(
    config,
    nativeTokenContractId(config),
    "transfer",
    [
      new Address(config.source.publicKey()).toScVal(),
      new Address(to).toScVal(),
      nativeToScVal(stroops, { type: "i128" }),
    ],
    onSubmitting
  );
}

export type TransactionOutcome = "success" | "failed" | "not_found";

/** Looks a submitted transaction up (the RPC only keeps recent history). */
export async function getTransactionOutcome(
  config: StellarNetworkConfig,
  txHash: string
): Promise<TransactionOutcome> {
  const { status } = await server(config).getTransaction(txHash);
  if (status === rpc.Api.GetTransactionStatus.SUCCESS) return "success";
  if (status === rpc.Api.GetTransactionStatus.FAILED) return "failed";
  return "not_found";
}

/** The treasury's XLM balance in stroops, read from the native asset contract. */
export async function getTreasuryBalance(config: StellarNetworkConfig): Promise<bigint> {
  const rpcServer = server(config);
  const tx = await buildCall(config, nativeTokenContractId(config), "balance", [
    new Address(config.source.publicKey()).toScVal(),
  ]);
  const sim = await rpcServer.simulateTransaction(tx);
  if (!rpc.Api.isSimulationSuccess(sim) || !sim.result) {
    throw new Error("Could not read the treasury balance");
  }
  return BigInt(scValToNative(sim.result.retval));
}

/** The payment operations redeemDisbursement needs, bound to a network config. */
export function stellarPaymentOps(config: StellarNetworkConfig = getStellarNetworkConfig()) {
  return {
    walletExists: (contractId: string) => walletExists(config, contractId),
    deployWallet: (ethAddress: string) => deployWallet(config, ethAddress),
    sendXlm: (to: string, stroops: bigint, onSubmitting?: OnSubmitting) =>
      sendXlm(config, to, stroops, onSubmitting),
    getTransactionOutcome: (txHash: string) => getTransactionOutcome(config, txHash),
  };
}
