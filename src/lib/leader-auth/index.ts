import { getPublicClient } from "@/lib/chain";
import { DB } from "@/lib/database/service";
import { SecurityEvent } from "@/lib/database/types";
import {
  LeaderActionMessage,
  LeaderActionType,
  createLeaderActionTypedData,
  leaderActionSchemas,
} from "@/lib/eip712/leader-actions";
import { getLeaderHatConfig, isLeader } from "@/lib/relayer";
import { defaultChain } from "@/wagmi/chain-config";
import { Address, Hex, isHex, verifyTypedData } from "viem";

/** A signature is accepted for this long after its issuedAt. */
export const MAX_SIGNATURE_AGE_SECONDS = 5 * 60;
/** Tolerated client clock drift for an issuedAt in the future. */
export const MAX_CLOCK_SKEW_SECONDS = 60;

export type LeaderAuthErrorCode =
  | "invalid_request"
  | "invalid_signature"
  | "expired_signature"
  | "not_leader"
  | "replay";

export class LeaderAuthError extends Error {
  constructor(
    readonly code: LeaderAuthErrorCode,
    message: string
  ) {
    super(message);
    this.name = "LeaderAuthError";
  }

  /** HTTP status a route should answer with. */
  get status(): number {
    return {
      invalid_request: 400,
      invalid_signature: 401,
      expired_signature: 401,
      not_leader: 403,
      replay: 409,
    }[this.code];
  }
}

export type VerifyLeaderActionDeps = {
  chainId: number;
  now: () => number; // unix seconds
  isLeader: (address: Address) => Promise<boolean>;
  consumeNonce: (leader: Address, nonce: string, action: LeaderActionType) => Promise<boolean>;
  logSecurityEvent: (event: SecurityEvent) => Promise<void>;
};

function defaultDeps(): VerifyLeaderActionDeps {
  return {
    chainId: defaultChain.id,
    now: () => Math.floor(Date.now() / 1000),
    isLeader: (address) => isLeader(getPublicClient(), getLeaderHatConfig(), address),
    consumeNonce: (leader, nonce, action) => DB.consumeLeaderActionNonce(leader, nonce, action),
    logSecurityEvent: (event) => DB.logSecurityEvent(event),
  };
}

const SECURITY_EVENT_FOR: Partial<Record<LeaderAuthErrorCode, SecurityEvent["event_type"]>> = {
  invalid_signature: "invalid_signature",
  expired_signature: "expired_signature",
  not_leader: "not_leader",
  replay: "replay_attempt",
};

/**
 * Verifies that `signature` is a current leader's EIP-712 signature over `message` for the
 * given action, and consumes its nonce so it cannot be replayed.
 *
 * The typed data is rebuilt server-side (domain and chain id included), so a signature made
 * for another chain, app or action never verifies. Throws LeaderAuthError on any failure.
 */
export async function verifyLeaderAction<T extends LeaderActionType>(
  input: { primaryType: T; message: unknown; signature: unknown },
  deps: VerifyLeaderActionDeps = defaultDeps()
): Promise<{ leader: Address; message: LeaderActionMessage<T> }> {
  const { primaryType } = input;

  const parsed = leaderActionSchemas[primaryType]?.safeParse(input.message);
  if (!parsed?.success) {
    throw new LeaderAuthError("invalid_request", `Invalid ${String(primaryType)} message`);
  }
  if (typeof input.signature !== "string" || !isHex(input.signature)) {
    throw new LeaderAuthError("invalid_request", "Invalid signature format");
  }
  const message = parsed.data as LeaderActionMessage<T>;
  const signature = input.signature as Hex;

  const fail = async (code: LeaderAuthErrorCode, reason: string): Promise<never> => {
    const eventType = SECURITY_EVENT_FOR[code];
    if (eventType) {
      await deps
        .logSecurityEvent({
          event_type: eventType,
          inviter_address: message.leader,
          recipient_address: "beneficiary" in message ? String(message.beneficiary) : null,
          signature,
          nonce: message.nonce,
          ip_address: null,
          user_agent: null,
          metadata: { action: primaryType, reason },
        })
        .catch((error) => console.error("Failed to log security event", error));
    }
    throw new LeaderAuthError(code, reason);
  };

  const age = deps.now() - Number(message.issuedAt);
  if (age > MAX_SIGNATURE_AGE_SECONDS || age < -MAX_CLOCK_SKEW_SECONDS) {
    return fail("expired_signature", "Signature is too old or issued in the future");
  }

  const typedData = createLeaderActionTypedData(primaryType, message, deps.chainId);
  const validSignature = await verifyTypedData({
    ...typedData,
    address: message.leader,
    signature,
  }).catch(() => false);
  if (!validSignature) {
    return fail("invalid_signature", "Signature does not match the leader and message");
  }

  if (!(await deps.isLeader(message.leader))) {
    return fail("not_leader", "Signer is not a current leader");
  }

  // Last, so a request that fails an earlier check does not burn the nonce
  if (!(await deps.consumeNonce(message.leader, message.nonce, primaryType))) {
    return fail("replay", "Signature has already been used");
  }

  return { leader: message.leader, message };
}
