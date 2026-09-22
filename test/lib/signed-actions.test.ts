// @vitest-environment node
import {
  SignedActionMessage,
  SignedActionType,
  createSignedActionTypedData,
} from "@/lib/eip712/signed-actions";
import {
  MAX_SIGNATURE_AGE_SECONDS,
  SignedActionError,
  VerifySignedActionDeps,
  verifyBeneficiaryAction,
  verifyLeaderAction,
  verifySignedAction,
} from "@/lib/signed-actions";
import { privateKeyToAccount } from "viem/accounts";
import { beforeEach, describe, expect, it, vi } from "vitest";

const CHAIN_ID = 11155111;
const NOW = 1_800_000_000;
// Well-known Anvil test keys
const leader = privateKeyToAccount(
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
);
const other = privateKeyToAccount(
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
);
const BENEFICIARY = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";

let usedNonces: Set<string>;
let deps: VerifySignedActionDeps & {
  hasRole: ReturnType<typeof vi.fn>;
  logSecurityEvent: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  usedNonces = new Set();
  deps = {
    chainId: CHAIN_ID,
    now: () => NOW,
    // `leader` is a leader, `other` a registered beneficiary
    hasRole: vi.fn(async (role: string, address: string) =>
      role === "account"
        ? true
        : role === "leader"
          ? address === leader.address
          : address === other.address
    ),
    consumeNonce: async (address, nonce) => {
      const key = `${address}:${nonce}`;
      if (usedNonces.has(key)) return false;
      usedNonces.add(key);
      return true;
    },
    logSecurityEvent: vi.fn(async () => {}),
  };
});

function addBeneficiary(
  overrides: Partial<SignedActionMessage<"AddBeneficiary">> = {}
): SignedActionMessage<"AddBeneficiary"> {
  return {
    leader: leader.address,
    beneficiary: BENEFICIARY,
    nonce: "nonce-0001",
    issuedAt: BigInt(NOW),
    ...overrides,
  };
}

async function sign<T extends SignedActionType>(
  primaryType: T,
  message: SignedActionMessage<T>,
  { signer = leader, chainId = CHAIN_ID } = {}
) {
  return signer.signTypedData(createSignedActionTypedData(primaryType, message, chainId) as never);
}

// JSON transport turns bigint into a string, as a real request would
const asJson = (message: object) =>
  JSON.parse(JSON.stringify(message, (_, v) => (typeof v === "bigint" ? v.toString() : v)));

async function expectCode(promise: Promise<unknown>, code: SignedActionError["code"]) {
  await expect(promise).rejects.toMatchObject({ name: "SignedActionError", code });
}

describe("verifyLeaderAction", () => {
  it("accepts a current leader's signed AddBeneficiary and consumes its nonce", async () => {
    const message = addBeneficiary();
    const signature = await sign("AddBeneficiary", message);

    const result = await verifyLeaderAction(
      { primaryType: "AddBeneficiary", message: asJson(message), signature },
      deps
    );

    expect(result).toEqual({ leader: leader.address, message });
    expect(usedNonces.has(`${leader.address}:nonce-0001`)).toBe(true);
    expect(deps.logSecurityEvent).not.toHaveBeenCalled();
  });

  it("accepts a signed CreateDisbursement", async () => {
    const message: SignedActionMessage<"CreateDisbursement"> = {
      ...addBeneficiary(),
      amount: "0.5",
    };
    const signature = await sign("CreateDisbursement", message);

    const result = await verifyLeaderAction(
      { primaryType: "CreateDisbursement", message: asJson(message), signature },
      deps
    );
    expect(result.message.amount).toBe("0.5");
  });

  it("rejects a replayed signature and logs it", async () => {
    const message = addBeneficiary();
    const signature = await sign("AddBeneficiary", message);
    const input = { primaryType: "AddBeneficiary" as const, message: asJson(message), signature };

    await verifyLeaderAction(input, deps);
    await expectCode(verifyLeaderAction(input, deps), "replay");
    expect(deps.logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "replay_attempt", inviter_address: leader.address })
    );
  });

  it("rejects a message changed after signing", async () => {
    const signature = await sign("AddBeneficiary", addBeneficiary());
    const tampered = addBeneficiary({ beneficiary: other.address });

    await expectCode(
      verifyLeaderAction(
        { primaryType: "AddBeneficiary", message: asJson(tampered), signature },
        deps
      ),
      "invalid_signature"
    );
  });

  it("rejects a signature from someone other than the named leader", async () => {
    const message = addBeneficiary();
    const signature = await sign("AddBeneficiary", message, { signer: other });

    await expectCode(
      verifyLeaderAction(
        { primaryType: "AddBeneficiary", message: asJson(message), signature },
        deps
      ),
      "invalid_signature"
    );
  });

  it("rejects a signature made for another chain", async () => {
    const message = addBeneficiary();
    const signature = await sign("AddBeneficiary", message, { chainId: 42220 });

    await expectCode(
      verifyLeaderAction(
        { primaryType: "AddBeneficiary", message: asJson(message), signature },
        deps
      ),
      "invalid_signature"
    );
  });

  it("rejects a signature presented as a different action", async () => {
    const message = addBeneficiary();
    const signature = await sign("AddBeneficiary", message);

    await expectCode(
      verifyLeaderAction(
        {
          primaryType: "CreateDisbursement",
          message: asJson({ ...message, amount: "1" }),
          signature,
        },
        deps
      ),
      "invalid_signature"
    );
  });

  it.each([
    ["too old", NOW - MAX_SIGNATURE_AGE_SECONDS - 1],
    ["from the future", NOW + 120],
  ])("rejects a signature issued %s", async (_, issuedAt) => {
    const message = addBeneficiary({ issuedAt: BigInt(issuedAt) });
    const signature = await sign("AddBeneficiary", message);

    await expectCode(
      verifyLeaderAction(
        { primaryType: "AddBeneficiary", message: asJson(message), signature },
        deps
      ),
      "expired_signature"
    );
  });

  it("rejects a signer who is not a leader, without burning the nonce", async () => {
    const message = addBeneficiary();
    const signature = await sign("AddBeneficiary", message);
    const input = { primaryType: "AddBeneficiary" as const, message: asJson(message), signature };
    deps.hasRole.mockResolvedValueOnce(false);

    await expectCode(verifyLeaderAction(input, deps), "not_leader");
    expect(deps.logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "not_leader" })
    );

    // Once they are a leader, the same (still fresh) signature works
    await expect(verifyLeaderAction(input, deps)).resolves.toMatchObject({
      leader: leader.address,
    });
  });

  it.each([
    ["an unknown field", { ...asJson(addBeneficiary()), extra: "x" }],
    ["an invalid address", { ...asJson(addBeneficiary()), beneficiary: "0x123" }],
    ["a missing nonce", { ...asJson(addBeneficiary()), nonce: undefined }],
  ])("rejects a message with %s as an invalid request", async (_, message) => {
    await expectCode(
      verifyLeaderAction({ primaryType: "AddBeneficiary", message, signature: "0x00" }, deps),
      "invalid_request"
    );
    expect(deps.logSecurityEvent).not.toHaveBeenCalled();
  });

  it.each(["0", "-1", "1.12345678", "abc"])("rejects disbursement amount %s", async (amount) => {
    await expectCode(
      verifyLeaderAction(
        {
          primaryType: "CreateDisbursement",
          message: { ...asJson(addBeneficiary()), amount },
          signature: "0x00",
        },
        deps
      ),
      "invalid_request"
    );
  });

  it("accepts a registered beneficiary's signed RedeemDisbursement", async () => {
    const message: SignedActionMessage<"RedeemDisbursement"> = {
      beneficiary: other.address,
      disbursementId: "6f1c7b8e-0d5a-4c1e-9d38-2f4b0a1c9e77",
      nonce: "nonce-0002",
      issuedAt: BigInt(NOW),
    };
    const signature = await sign("RedeemDisbursement", message, { signer: other });

    const result = await verifyBeneficiaryAction(
      { primaryType: "RedeemDisbursement", message: asJson(message), signature },
      deps
    );
    expect(result).toEqual({ beneficiary: other.address, message });
    expect(deps.hasRole).toHaveBeenCalledWith("beneficiary", other.address);
  });

  it("rejects a beneficiary action from someone who is not a registered beneficiary", async () => {
    const message: SignedActionMessage<"RedeemDisbursement"> = {
      beneficiary: leader.address,
      disbursementId: "6f1c7b8e-0d5a-4c1e-9d38-2f4b0a1c9e77",
      nonce: "nonce-0003",
      issuedAt: BigInt(NOW),
    };
    const signature = await sign("RedeemDisbursement", message);

    await expectCode(
      verifyBeneficiaryAction(
        { primaryType: "RedeemDisbursement", message: asJson(message), signature },
        deps
      ),
      "not_beneficiary"
    );
    expect(deps.logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "not_beneficiary" })
    );
  });

  it("accepts StartSession from any wallet, once", async () => {
    const message: SignedActionMessage<"StartSession"> = {
      account: other.address,
      nonce: "nonce-0005",
      issuedAt: BigInt(NOW),
    };
    const signature = await sign("StartSession", message, { signer: other });
    const input = { primaryType: "StartSession" as const, message: asJson(message), signature };

    await expect(verifySignedAction(input, deps)).resolves.toEqual({
      signer: other.address,
      message,
    });
    expect(deps.hasRole).not.toHaveBeenCalledWith("leader", other.address);
    await expectCode(verifySignedAction(input, deps), "replay");
  });

  it("rejects a RedeemDisbursement whose id is not a uuid", async () => {
    await expectCode(
      verifyBeneficiaryAction(
        {
          primaryType: "RedeemDisbursement",
          message: {
            beneficiary: other.address,
            disbursementId: "1",
            nonce: "nonce-0004",
            issuedAt: String(NOW),
          },
          signature: "0x00",
        },
        deps
      ),
      "invalid_request"
    );
  });

  it("maps error codes to HTTP statuses", () => {
    expect(new SignedActionError("invalid_request", "").status).toBe(400);
    expect(new SignedActionError("invalid_signature", "").status).toBe(401);
    expect(new SignedActionError("not_leader", "").status).toBe(403);
    expect(new SignedActionError("replay", "").status).toBe(409);
  });
});
