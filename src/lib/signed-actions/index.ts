import { getPublicClient } from "@/lib/chain";
import { DB } from "@/lib/database/service";
import { SecurityEvent } from "@/lib/database/types";
import {
  BeneficiaryActionType,
  LeaderActionType,
  READ_ONLY_ACTIONS,
  SIGNER_ROLE,
  SignedActionMessage,
  SignedActionType,
  SignerRole,
  createSignedActionTypedData,
  signedActionSchemas,
  signerOf,
} from "@/lib/eip712/signed-actions";
import { getLeaderHatConfig, isLeader } from "@/lib/relayer";
import { defaultChain } from "@/wagmi/chain-config";
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

export type VerifySignedActionDeps = {
  chainId: number;
  now: () => number; // unix seconds
  /** Whether the address currently holds the role (leader hat / registered beneficiary). */
  hasRole: (role: SignerRole, address: Address) => Promise<boolean>;
  consumeNonce: (signer: Address, nonce: string, action: SignedActionType) => Promise<boolean>;
  logSecurityEvent: (event: SecurityEvent) => Promise<void>;
};

function defaultDeps(): VerifySignedActionDeps {
  return {
    chainId: defaultChain.id,
    now: () => Math.floor(Date.now() / 1000),
    hasRole: async (role, address) =>
      role === "leader"
        ? isLeader(getPublicClient(), getLeaderHatConfig(), address)
        : (await DB.findBeneficiaryByEthAddress(address)) !== null,
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
 * Verifies that `signature` is the EIP-712 signature of the action's signer (see SIGNER_ROLE)
 * over `message`, that the signer currently holds that role, and (for actions that change
 * state) consumes the nonce so the signature cannot be replayed.
 *
 * The typed data is rebuilt server-side (domain and chain id included), so a signature made
 * for another chain, app or action never verifies. Throws SignedActionError on any failure.
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
  const role = SIGNER_ROLE[primaryType];
  const signer = signerOf(primaryType, message);
  const fields = message as Record<string, unknown>;

  const fail = async (code: SignedActionErrorCode, reason: string): Promise<never> => {
    const eventType = SECURITY_EVENT_FOR[code];
    if (eventType) {
      await deps
        .logSecurityEvent({
          event_type: eventType,
          inviter_address: typeof fields.leader === "string" ? fields.leader : null,
          recipient_address: typeof fields.beneficiary === "string" ? fields.beneficiary : null,
          signature,
          nonce: message.nonce,
          ip_address: null,
          user_agent: null,
          metadata: { action: primaryType, signer, reason },
        })
        .catch((error) => console.error("Failed to log security event", error));
    }
    throw new SignedActionError(code, reason);
  };

  const age = deps.now() - Number(message.issuedAt);
  if (age > MAX_SIGNATURE_AGE_SECONDS || age < -MAX_CLOCK_SKEW_SECONDS) {
    return fail("expired_signature", "Signature is too old or issued in the future");
  }

  const typedData = createSignedActionTypedData(primaryType, message, deps.chainId);
  const validSignature = await verifyTypedData({ ...typedData, address: signer, signature }).catch(
    () => false
  );
  if (!validSignature) {
    return fail("invalid_signature", `Signature does not match the ${role} and message`);
  }

  if (!(await deps.hasRole(role, signer))) {
    return role === "leader"
      ? fail("not_leader", "Signer is not a current leader")
      : fail("not_beneficiary", "Signer is not a registered beneficiary");
  }

  // Last, so a request that fails an earlier check does not burn the nonce. Read-only
  // actions skip it: reusing their signature within its lifetime changes nothing.
  if (
    !READ_ONLY_ACTIONS.has(primaryType) &&
    !(await deps.consumeNonce(signer, message.nonce, primaryType))
  ) {
    return fail("replay", "Signature has already been used");
  }

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

/** verifySignedAction for an action signed by a registered beneficiary. */
export async function verifyBeneficiaryAction<T extends BeneficiaryActionType>(
  input: { primaryType: T; message: unknown; signature: unknown },
  deps?: VerifySignedActionDeps
): Promise<{ beneficiary: Address; message: SignedActionMessage<T> }> {
  const { signer, message } = await verifySignedAction(input, deps);
  return { beneficiary: signer, message };
}
