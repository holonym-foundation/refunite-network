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
  verifyStellarAction,
  verifyLeaderAction,
  verifySignedAction,
} from "@/lib/signed-actions";
import { privateKeyToAccount } from "viem/accounts";
import {
  TEST_STELLAR_PASSPHRASE,
  stellarAccounts,
  stellarSignedBody,
} from "../helpers/signed-actions";
import { buildStellarActionMessage } from "@/lib/stellar/signed-actions";
import { Keypair } from "@stellar/stellar-sdk";
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
// Beneficiaries are Stellar accounts
const stellarBeneficiary = stellarAccounts.beneficiary;
const stellarOther = stellarAccounts.other;
const BENEFICIARY = stellarBeneficiary.publicKey();

let usedNonces: Set<string>;
let deps: VerifySignedActionDeps & {
  hasRole: ReturnType<typeof vi.fn>;
  logSecurityEvent: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  usedNonces = new Set();
  deps = {
    chainId: CHAIN_ID,
    stellarNetworkPassphrase: TEST_STELLAR_PASSPHRASE,
    now: () => NOW,
    // `leader` is a leader, the Stellar `beneficiary` account a registered beneficiary
    hasRole: vi.fn(async (role: string, address: string) =>
      role === "account"
        ? true
        : role === "leader"
          ? address === leader.address
          : address === BENEFICIARY
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
    const tampered = addBeneficiary({ beneficiary: stellarOther.publicKey() });

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

  it("maps error codes to HTTP statuses", () => {
    expect(new SignedActionError("invalid_request", "").status).toBe(400);
    expect(new SignedActionError("invalid_signature", "").status).toBe(401);
    expect(new SignedActionError("not_leader", "").status).toBe(403);
    expect(new SignedActionError("replay", "").status).toBe(409);
  });
});

describe("verifyStellarAction (beneficiaries)", () => {
  const DISBURSEMENT = "6f1c7b8e-0d5a-4c1e-9d38-2f4b0a1c9e77";
  const redeemBody = (signer: Keypair = stellarBeneficiary, opts = {}) =>
    stellarSignedBody(
      signer,
      "RedeemDisbursement",
      { disbursementId: DISBURSEMENT },
      {
        issuedAt: NOW,
        ...opts,
      }
    );
  const verify = (body: { message: unknown; signature: unknown }) =>
    verifyBeneficiaryAction({ primaryType: "RedeemDisbursement", ...body }, deps);

  it("accepts a registered beneficiary's SEP-53 signed RedeemDisbursement", async () => {
    const result = await verify(redeemBody());
    expect(result.beneficiary).toBe(BENEFICIARY);
    expect(result.message.disbursementId).toBe(DISBURSEMENT);
    expect(deps.hasRole).toHaveBeenCalledWith("beneficiary", BENEFICIARY);
  });

  it("also accepts a plain ed25519 signature of the text (wallets before SEP-53)", async () => {
    const body = redeemBody();
    const text = buildStellarActionMessage(
      "RedeemDisbursement",
      { ...body.message, issuedAt: BigInt(NOW) } as never,
      TEST_STELLAR_PASSPHRASE
    );
    const raw = Buffer.from(stellarBeneficiary.sign(Buffer.from(text))).toString("base64");
    await expect(verify({ ...body, signature: raw })).resolves.toMatchObject({
      beneficiary: BENEFICIARY,
    });
  });

  it("rejects someone who is not a registered beneficiary", async () => {
    await expectCode(verify(redeemBody(stellarOther)), "not_beneficiary");
    expect(deps.logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "not_beneficiary" })
    );
  });

  it("rejects a signature made for another Stellar network", async () => {
    const body = redeemBody(stellarBeneficiary, {
      passphrase: "Public Global Stellar Network ; September 2015",
    });
    await expectCode(verify(body), "invalid_signature");
  });

  it("rejects a message changed after signing", async () => {
    const body = redeemBody();
    const tampered = { ...body.message, disbursementId: "11111111-2222-4333-8444-555555555555" };
    await expectCode(verify({ ...body, message: tampered }), "invalid_signature");
  });

  it("rejects a signature by another account than the one named", async () => {
    const body = redeemBody();
    const forged = redeemBody(stellarOther);
    await expectCode(verify({ ...body, signature: forged.signature }), "invalid_signature");
  });

  it("rejects a replay", async () => {
    const body = redeemBody();
    await verify(body);
    await expectCode(verify(body), "replay");
  });

  it("rejects an expired signature", async () => {
    await expectCode(
      verify(redeemBody(stellarBeneficiary, { issuedAt: NOW - MAX_SIGNATURE_AGE_SECONDS - 1 })),
      "expired_signature"
    );
  });

  it.each([
    ["an invalid account checksum", { beneficiary: "G" + "A".repeat(55) }],
    ["a disbursement id that is not a uuid", { disbursementId: "1" }],
  ])("rejects %s as an invalid request", async (_, override) => {
    const body = redeemBody();
    await expectCode(
      verify({ ...body, message: { ...body.message, ...override } }),
      "invalid_request"
    );
  });

  it("rejects a signature in the wrong format", async () => {
    await expectCode(verify({ ...redeemBody(), signature: "not-a-signature" }), "invalid_request");
  });

  it("accepts StartStellarSession from any Stellar account", async () => {
    const body = stellarSignedBody(stellarOther, "StartStellarSession", {}, { issuedAt: NOW });
    await expect(
      verifyStellarAction({ primaryType: "StartStellarSession", ...body }, deps)
    ).resolves.toMatchObject({ signer: stellarOther.publicKey() });
  });
});
