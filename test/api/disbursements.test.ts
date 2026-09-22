// @vitest-environment node
import { POST as addBeneficiaryRoute } from "@/app/api/beneficiaries/route";
import { GET as listBeneficiariesRoute } from "@/app/api/beneficiaries/list/route";
import { POST as createDisbursementRoute } from "@/app/api/disbursements/route";
import { GET as myDisbursementsRoute } from "@/app/api/disbursements/mine/route";
import { POST as redeemRoute } from "@/app/api/disbursements/redeem/route";
import { db } from "@/lib/db";
import { SignedActionType } from "@/lib/eip712/signed-actions";
import { isLeader } from "@/lib/relayer";
import { xlmToStroops } from "@/lib/stellar/amount";
import { getTreasuryBalance, stellarPaymentOps } from "@/lib/stellar/network";
import { defaultChain } from "@/wagmi/chain-config";
import { sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { PrivateKeyAccount } from "viem/accounts";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { accounts, sessionCookie, signedBody } from "../helpers/signed-actions";

vi.mock("@/lib/db", () => import("../helpers/db").then((m) => m.createTestDbModule()));

vi.mock("@/lib/relayer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/relayer")>()),
  getLeaderHatConfig: () => ({ hatsAddress: "0x0", leaderHatId: BigInt(1) }),
  isLeader: vi.fn(),
}));

// The Stellar network; everything else (signatures, limits, DB) is real
const payments = {
  walletExists: vi.fn(async () => false),
  deployWallet: vi.fn(async () => "deploy-hash"),
  sendXlm: vi.fn(async () => "pay-hash"),
};
vi.mock("@/lib/stellar/network", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/stellar/network")>()),
  getStellarNetworkConfig: () => ({}),
  getTreasuryBalance: vi.fn(),
  stellarPaymentOps: vi.fn(() => payments),
}));

const { leaderA, leaderB, beneficiary, stranger } = accounts;

const signed = <T extends SignedActionType>(
  signer: PrivateKeyAccount,
  primaryType: T,
  fields: Parameters<typeof signedBody<T>>[2]
) => signedBody(signer, primaryType, fields, { chainId: defaultChain.id });

async function call(route: (r: NextRequest) => Promise<Response>, body: unknown) {
  const res = await route(
    new NextRequest("http://localhost/api", { method: "POST", body: JSON.stringify(body) })
  );
  return { status: res.status, body: await res.json() };
}

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-that-is-at-least-32-chars";
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
  process.env.NEXT_PUBLIC_STELLAR_ECDSA_SECP256K1_FACTORY_CONTRACT_ID =
    "CDJOTVVKNPEQP577P2GSYBPFVEY3JPJ7QJ3T2YWPMTI3TWIKNPTDO7Z2";
  process.env.WALLET_SALT = "0102030405060708090a0b0c";
});

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE disbursements, beneficiaries, leader_action_nonces, security_events, audit_log CASCADE`
  );
  vi.clearAllMocks();
  vi.mocked(isLeader).mockImplementation(async (_c, _cfg, address) =>
    [leaderA.address, leaderB.address].includes(address as `0x${string}`)
  );
  vi.mocked(getTreasuryBalance).mockResolvedValue(xlmToStroops("1000"));
  expect(
    (
      await call(
        addBeneficiaryRoute,
        await signed(leaderA, "AddBeneficiary", { beneficiary: beneficiary.address })
      )
    ).status
  ).toBe(201);
});

async function getWithSession(
  route: (r: NextRequest) => Promise<Response>,
  signer: PrivateKeyAccount
) {
  const res = await route(
    new NextRequest("http://localhost/api", {
      headers: { cookie: await sessionCookie(signer, defaultChain.id) },
    })
  );
  return { status: res.status, body: await res.json() };
}

const disburse = async (amount: string, signer = leaderA) =>
  call(
    createDisbursementRoute,
    await signed(signer, "CreateDisbursement", { beneficiary: beneficiary.address, amount })
  );

describe("disbursements API", () => {
  it("runs the whole flow: disburse, list, redeem", async () => {
    const created = await disburse("0.5");
    expect(created.status).toBe(201);
    const { id } = created.body.disbursement;

    const mine = await getWithSession(myDisbursementsRoute, beneficiary);
    expect(mine.body.disbursements).toEqual([
      expect.objectContaining({ id, amount: "0.5", status: "pending" }),
    ]);

    const redeemed = await call(
      redeemRoute,
      await signed(beneficiary, "RedeemDisbursement", { disbursementId: id })
    );
    expect(redeemed).toMatchObject({
      status: 200,
      body: { disbursement: { id, status: "redeemed", txHash: "pay-hash" } },
    });
    expect(payments.deployWallet).toHaveBeenCalledWith(beneficiary.address);
    expect(payments.sendXlm).toHaveBeenCalledWith(
      "CC3ARJ4BI6Q2IW7J27YC3K7VHC7O25PZZ74OGFL7RKG5THHEMVJVN7CY",
      xlmToStroops("0.5")
    );
    expect(stellarPaymentOps).toHaveBeenCalled();
  });

  it("shows the leader their disbursements and remaining allowance", async () => {
    await disburse("1");
    const listed = await getWithSession(listBeneficiariesRoute, leaderA);
    expect(listed.body.allowance).toEqual({
      balance: "99",
      usedLast24h: "1",
      maxPerDisbursement: "1",
      maxPerLeaderPerDay: "10",
    });
    expect(listed.body.disbursements).toHaveLength(1);
  });

  it("rejects a disbursement to another leader's beneficiary", async () => {
    expect(await disburse("0.5", leaderB)).toMatchObject({
      status: 404,
      body: { code: "beneficiary_not_found" },
    });
  });

  it("rejects an amount over the per-disbursement limit", async () => {
    expect(await disburse("2")).toMatchObject({
      status: 422,
      body: { code: "exceeds_per_disbursement" },
    });
  });

  it("answers 503 when the treasury balance cannot be read", async () => {
    vi.mocked(getTreasuryBalance).mockRejectedValue(new Error("rpc down"));
    expect(await disburse("0.5")).toMatchObject({
      status: 503,
      body: { code: "stellar_unavailable" },
    });
  });

  it("shows no disbursements to a wallet that is not a beneficiary", async () => {
    expect(await getWithSession(myDisbursementsRoute, stranger)).toEqual({
      status: 200,
      body: { disbursements: [] },
    });
  });

  it("rejects redeeming by someone who is not a registered beneficiary", async () => {
    const { id } = (await disburse("0.5")).body.disbursement;
    const res = await call(
      redeemRoute,
      await signed(stranger, "RedeemDisbursement", { disbursementId: id })
    );
    expect(res).toMatchObject({ status: 403, body: { code: "not_beneficiary" } });
  });

  it("rejects a leader-signed CreateDisbursement from a non-leader", async () => {
    const res = await call(
      createDisbursementRoute,
      await signed(stranger, "CreateDisbursement", {
        beneficiary: beneficiary.address,
        amount: "0.5",
      })
    );
    expect(res).toMatchObject({ status: 403, body: { code: "not_leader" } });
  });

  it("does not redeem twice", async () => {
    const { id } = (await disburse("0.5")).body.disbursement;
    await call(
      redeemRoute,
      await signed(beneficiary, "RedeemDisbursement", { disbursementId: id })
    );
    const again = await call(
      redeemRoute,
      await signed(beneficiary, "RedeemDisbursement", { disbursementId: id })
    );
    expect(again).toMatchObject({ status: 409, body: { code: "not_redeemable" } });
    expect(payments.sendXlm).toHaveBeenCalledTimes(1);
  });
});
