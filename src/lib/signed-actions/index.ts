import { getPublicClient } from "@/lib/chain";
import { DB } from "@/lib/database/service";
import { SecurityEvent } from "@/lib/database/types";
import {
  LeaderActionType,
  SIGNER_ROLE,
  SignedActionMessage,
  SignedActionType,
  createSignedActionTypedData,
  signedActionSchemas,
  signerOf,
} from "@/lib/eip712/signed-actions";
import { getLeaderHatConfig, isLeader } from "@/lib/relayer";
import {
  STELLAR_ACTIONS,
  StellarActionMessage,
  StellarActionType,
  buildStellarActionMessage,
  stellarActionSchemas,
  stellarSignerOf,
} from "@/lib/stellar/signed-actions";
import { defaultChain } from "@/wagmi/chain-config";
import { Keypair, StrKey } from "@stellar/stellar-sdk";
import { Address, Hex, isHex, verifyTypedData } from "viem";

import { MAX_CLOCK_SKEW_SECONDS, MAX_SIGNATURE_AGE_SECONDS } from "./constants";

export { MAX_CLOCK_SKEW_SECONDS, MAX_SIGNATURE_AGE_SECONDS };

export type SignedActionErrorCode =
  | "invalid_request"
  | "invalid_signature"
  | "expired_signature"
  | "not_leader"
  | "not_beneficiary"
  | "replay";

export class SignedActionError extends Error {
  constructor(
    readonly code: SignedActionErrorCode,
    message: string
  ) {
    super(message);
    this.name = "SignedActionError";
  }

  /** HTTP status a route should answer with. */
  get status(): number {
    return {
      invalid_request: 400,
      invalid_signature: 401,
      expired_signature: 401,
      not_leader: 403,
      not_beneficiary: 403,
      replay: 409,
    }[this.code];
  }
}

/**
 * Who signs: "account" is anyone proving their address (sessions), "leader" a wearer of the
 * Community Leader hat (Ethereum address), "beneficiary" a registered beneficiary (Stellar
 * account).
 */
export type Role = "account" | "leader" | "beneficiary";

export type VerifySignedActionDeps = {
  chainId: number;
  stellarNetworkPassphrase: string;
  now: () => number; // unix seconds
  /** Whether the signer currently holds the role. */
  hasRole: (role: Role, signer: string) => Promise<boolean>;
  consumeNonce: (signer: string, nonce: string, action: string) => Promise<boolean>;
  logSecurityEvent: (event: SecurityEvent) => Promise<void>;
};

function defaultDeps(): VerifySignedActionDeps {
  return {
    chainId: defaultChain.id,
    stellarNetworkPassphrase: process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? "",
    now: () => Math.floor(Date.now() / 1000),
    hasRole: async (role, signer) => {
      if (role === "account") return true; // proving the address is all a session needs
      if (role === "leader") return isLeader(getPublicClient(), getLeaderHatConfig(), signer);
      return (await DB.findBeneficiaryByStellarAddress(signer)) !== null;
    },
    consumeNonce: (signer, nonce, action) => DB.consumeSignedActionNonce(signer, nonce, action),
    logSecurityEvent: (event) => DB.logSecurityEvent(event),
  };
}

const SECURITY_EVENT_FOR: Partial<Record<SignedActionErrorCode, SecurityEvent["event_type"]>> = {
  invalid_signature: "invalid_signature",
  expired_signature: "expired_signature",
  not_leader: "not_leader",
  not_beneficiary: "not_beneficiary",
  replay: "replay_attempt",
};

/**
 * The checks every signed action goes through, whatever the signature scheme: fresh, signed
 * by the signer, signer holds the role, nonce not used before. Throws SignedActionError.
 */
async function checkSignedAction(
  action: {
    primaryType: string;
    role: Role;
    signer: string;
    nonce: string;
    issuedAt: bigint;
    signature: string;
    fields: Record<string, unknown>;
    verifySignature: () => Promise<boolean>;
  },
  deps: VerifySignedActionDeps
): Promise<void> {
  const { primaryType, role, signer, fields } = action;

  const fail = async (code: SignedActionErrorCode, reason: string): Promise<never> => {
    const eventType = SECURITY_EVENT_FOR[code];
    if (eventType) {
      await deps
        .logSecurityEvent({
          event_type: eventType,
          inviter_address: typeof fields.leader === "string" ? fields.leader : null,
          recipient_address: typeof fields.beneficiary === "string" ? fields.beneficiary : null,
          signature: action.signature,
          nonce: action.nonce,
          ip_address: null,
          user_agent: null,
          metadata: { action: primaryType, signer, reason },
        })
        .catch((error) => console.error("Failed to log security event", error));
    }
    throw new SignedActionError(code, reason);
  };

  const age = deps.now() - Number(action.issuedAt);
  if (age > MAX_SIGNATURE_AGE_SECONDS || age < -MAX_CLOCK_SKEW_SECONDS) {
    return fail("expired_signature", "Signature is too old or issued in the future");
  }

  if (!(await action.verifySignature().catch(() => false))) {
    return fail("invalid_signature", `Signature does not match the ${role} and message`);
  }

  if (!(await deps.hasRole(role, signer))) {
    if (role === "leader") return fail("not_leader", "Signer is not a current leader");
    return fail("not_beneficiary", "Signer is not a registered beneficiary");
  }

  // Last, so a request that fails an earlier check does not burn the nonce
  if (!(await deps.consumeNonce(signer, action.nonce, primaryType))) {
    return fail("replay", "Signature has already been used");
  }
}

// =====================================================
// ETHEREUM (EIP-712): leaders and sessions
// =====================================================

/**
 * Verifies that `signature` is the EIP-712 signature of the action's signer (see SIGNER_ROLE)
 * over `message`, that the signer currently holds that role, and consumes the nonce so the
 * signature cannot be replayed.
 *
 * The typed data is rebuilt server-side (domain and chain id included), so a signature made
 * for another chain, app or action never verifies.
 */
export async function verifySignedAction<T extends SignedActionType>(
  input: { primaryType: T; message: unknown; signature: unknown },
  deps: VerifySignedActionDeps = defaultDeps()
): Promise<{ signer: Address; message: SignedActionMessage<T> }> {
  const { primaryType } = input;

  const parsed = signedActionSchemas[primaryType]?.safeParse(input.message);
  if (!parsed?.success) {
    throw new SignedActionError("invalid_request", `Invalid ${String(primaryType)} message`);
  }
  if (typeof input.signature !== "string" || !isHex(input.signature)) {
    throw new SignedActionError("invalid_request", "Invalid signature format");
  }
  const message = parsed.data as SignedActionMessage<T>;
  const signature = input.signature as Hex;
  const signer = signerOf(primaryType, message);

  await checkSignedAction(
    {
      primaryType,
      role: SIGNER_ROLE[primaryType],
      signer,
      nonce: message.nonce,
      issuedAt: message.issuedAt,
      signature,
      fields: message as Record<string, unknown>,
      verifySignature: () =>
        verifyTypedData({
          ...createSignedActionTypedData(primaryType, message, deps.chainId),
          address: signer,
          signature,
        }),
    },
    deps
  );
  return { signer, message };
}

/** verifySignedAction for an action signed by a current leader. */
export async function verifyLeaderAction<T extends LeaderActionType>(
  input: { primaryType: T; message: unknown; signature: unknown },
  deps?: VerifySignedActionDeps
): Promise<{ leader: Address; message: SignedActionMessage<T> }> {
  const { signer, message } = await verifySignedAction(input, deps);
  return { leader: signer, message };
}

// =====================================================
// STELLAR (SEP-53): beneficiaries
// =====================================================

/** A 64-byte ed25519 signature as base64 (Freighter) or hex. */
function decodeStellarSignature(signature: string): Buffer | null {
  const bytes = /^[0-9a-fA-F]{128}$/.test(signature)
    ? Buffer.from(signature, "hex")
    : Buffer.from(signature, "base64");
  return bytes.length === 64 ? bytes : null;
}

/**
 * Whether `signature` is `account`'s signature over `text`: SEP-53 ("Stellar Signed
 * Message:\n" prefix, SHA-256), or a plain ed25519 signature of the text for wallets that
 * predate SEP-53. Either proves control of the key over this exact message.
 */
export function verifyStellarSignature(account: string, text: string, signature: Buffer) {
  const keypair = Keypair.fromPublicKey(account);
  return keypair.verifyMessage(text, signature) || keypair.verify(Buffer.from(text), signature);
}

/**
 * Verifies a Stellar-signed action (see src/lib/stellar/signed-actions.ts): the text is
 * rebuilt from the fields and this server's network passphrase, then checked like an EIP-712
 * action (fresh, signer holds the role, nonce used once).
 */
export async function verifyStellarAction<T extends StellarActionType>(
  input: { primaryType: T; message: unknown; signature: unknown },
  deps: VerifySignedActionDeps = defaultDeps()
): Promise<{ signer: string; message: StellarActionMessage<T> }> {
  const { primaryType } = input;

  const parsed = stellarActionSchemas[primaryType]?.safeParse(input.message);
  if (!parsed?.success) {
    throw new SignedActionError("invalid_request", `Invalid ${String(primaryType)} message`);
  }
  const message = parsed.data as StellarActionMessage<T>;
  const signer = stellarSignerOf(primaryType, message);
  if (!StrKey.isValidEd25519PublicKey(signer)) {
    throw new SignedActionError("invalid_request", "Invalid Stellar account address");
  }
  const signature =
    typeof input.signature === "string" ? decodeStellarSignature(input.signature) : null;
  if (!signature) throw new SignedActionError("invalid_request", "Invalid signature format");
  if (!deps.stellarNetworkPassphrase) {
    throw new Error("NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE is not set");
  }

  await checkSignedAction(
    {
      primaryType,
      role: STELLAR_ACTIONS[primaryType].signer,
      signer,
      nonce: message.nonce,
      issuedAt: message.issuedAt,
      signature: input.signature as string,
      fields: message as Record<string, unknown>,
      verifySignature: async () =>
        verifyStellarSignature(
          signer,
          buildStellarActionMessage(primaryType, message, deps.stellarNetworkPassphrase),
          signature
        ),
    },
    deps
  );
  return { signer, message };
}

/** verifyStellarAction for an action signed by a registered beneficiary. */
export async function verifyBeneficiaryAction<T extends StellarActionType>(
  input: { primaryType: T; message: unknown; signature: unknown },
  deps?: VerifySignedActionDeps
): Promise<{ beneficiary: string; message: StellarActionMessage<T> }> {
  const { signer, message } = await verifyStellarAction(input, deps);
  return { beneficiary: signer, message };
}
