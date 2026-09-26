// @vitest-environment node
import { POST as addBeneficiaryRoute } from "@/app/api/beneficiaries/route";
import { GET as listBeneficiariesRoute } from "@/app/api/beneficiaries/list/route";
import { POST as createDisbursementRoute } from "@/app/api/disbursements/route";
import { GET as myDisbursementsRoute } from "@/app/api/disbursements/mine/route";
import { POST as redeemRoute } from "@/app/api/disbursements/redeem/route";
import { POST as cancelRoute } from "@/app/api/disbursements/cancel/route";
import { db } from "@/lib/db";
import { SignedActionType } from "@/lib/eip712/signed-actions";
import { isLeader } from "@/lib/relayer";
import { xlmToStroops } from "@/lib/stellar/amount";
import { accountExists, getTreasuryBalance, stellarPaymentOps } from "@/lib/stellar/network";
import { defaultChain } from "@/wagmi/chain-config";
import { Keypair } from "@stellar/stellar-sdk";
import { sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { PrivateKeyAccount } from "viem/accounts";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TEST_STELLAR_PASSPHRASE,
  accounts,
  sessionCookie,
  signedBody,
  stellarAccounts,
  stellarSessionCookie,
  stellarSignedBody,
} from "../helpers/signed-actions";

vi.mock("@/lib/db", () => import("../helpers/db").then((m) => m.createTestDbModule()));

vi.mock("@/lib/relayer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/relayer")>()),
  getLeaderHatConfig: () => ({ hatsAddress: "0x0", leaderHatId: BigInt(1) }),
  isLeader: vi.fn(),
}));

// The Stellar network; everything else (signatures, limits, sessions, DB) is real
const payments = { sendXlm: vi.fn(async () => "pay-hash") };
vi.mock("@/lib/stellar/network", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/stellar/network")>()),
  getStellarNetworkConfig: () => ({}),
  getTreasuryBalance: vi.fn(),
  accountExists: vi.fn(),
  stellarPaymentOps: vi.fn(() => payments),
}));

const { leaderA, leaderB, stranger } = accounts;
const beneficiary = stellarAccounts.beneficiary; // a Stellar account
const strangerAccount = stellarAccounts.other; // a Stellar account nobody added

const signed = <T extends SignedActionType>(
  signer: PrivateKeyAccount,
  primaryType: T,
  fields: Parameters<typeof signedBody<T>>[2]
) => signedBody(signer, primaryType, fields, { chainId: defaultChain.id });

const redeemBody = (signer: Keypair, disbursementId: string) =>
  stellarSignedBody(signer, "RedeemDisbursement", { disbursementId });

async function call(route: (r: NextRequest) => Promise<Response>, body: unknown) {
  const res = await route(
    new NextRequest("http://localhost/api", { method: "POST", body: JSON.stringify(body) })
  );
  return { status: res.status, body: await res.json() };
}

async function get(route: (r: NextRequest) => Promise<Response>, cookie: string) {
  const res = await route(new NextRequest("http://localhost/api", { headers: { cookie } }));
  return { status: res.status, body: await res.json() };
}

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-that-is-at-least-32-chars";
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE = TEST_STELLAR_PASSPHRASE;
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
  vi.mocked(accountExists).mockResolvedValue(true);
  expect(
    (
      await call(
        addBeneficiaryRoute,
        await signed(leaderA, "AddBeneficiary", { beneficiary: beneficiary.publicKey() })
      )
    ).status
  ).toBe(201);
});

const disburse = async (amount: string, signer = leaderA) =>
  call(
    createDisbursementRoute,
    await signed(signer, "CreateDisbursement", { beneficiary: beneficiary.publicKey(), amount })
  );

describe("disbursements API", () => {
  it("runs the whole flow: disburse, list (Stellar session), redeem (Stellar signature)", async () => {
    const created = await disburse("0.5");
    expect(created.status).toBe(201);
    const { id } = created.body.disbursement;

    const mine = await get(myDisbursementsRoute, await stellarSessionCookie(beneficiary));
    expect(mine.body.disbursements).toEqual([
      expect.objectContaining({ id, amount: "0.5", status: "pending" }),
    ]);

    const redeemed = await call(redeemRoute, redeemBody(beneficiary, id));
    expect(redeemed).toMatchObject({
      status: 200,
      body: { disbursement: { id, status: "redeemed", txHash: "pay-hash" } },
    });
    expect(payments.sendXlm).toHaveBeenCalledWith(
      beneficiary.publicKey(),
      xlmToStroops("0.5"),
      expect.any(Function)
    );
    expect(stellarPaymentOps).toHaveBeenCalled();
  });

  it("needs at least 1 XLM for a Stellar account that does not exist yet", async () => {
    vi.mocked(accountExists).mockResolvedValue(false);
    expect(await disburse("0.5")).toMatchObject({
      status: 422,
      body: { code: "new_account_minimum" },
    });
    expect((await disburse("1")).status).toBe(201);
  });

  it("shows the leader their disbursements and remaining allowance", async () => {
    await disburse("1");
    const listed = await get(listBeneficiariesRoute, await sessionCookie(leaderA, defaultChain.id));
    expect(listed.body.allowance).toEqual({
      balance: "99",
      usedLast24h: "1",
      maxPerDisbursement: "1",
      maxPerLeaderPerDay: "10",
    });
    expect(listed.body.disbursements).toEqual([
      expect.objectContaining({ beneficiary: beneficiary.publicKey(), amount: "1" }),
    ]);
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

  it("answers 503 when the Stellar network cannot be read", async () => {
    vi.mocked(getTreasuryBalance).mockRejectedValue(new Error("rpc down"));
    expect(await disburse("0.5")).toMatchObject({
      status: 503,
      body: { code: "stellar_unavailable" },
    });
  });

  it("shows no disbursements to a Stellar account that is not a beneficiary", async () => {
    expect(await get(myDisbursementsRoute, await stellarSessionCookie(strangerAccount))).toEqual({
      status: 200,
      body: { disbursements: [] },
    });
  });

  it("does not accept a leader's (EVM) session as a beneficiary session", async () => {
    const res = await get(myDisbursementsRoute, await sessionCookie(leaderA, defaultChain.id));
    expect(res).toMatchObject({ status: 401, body: { code: "no_session" } });
  });

  it("rejects redeeming by a Stellar account that is not a registered beneficiary", async () => {
    const { id } = (await disburse("0.5")).body.disbursement;
    const res = await call(redeemRoute, redeemBody(strangerAccount, id));
    expect(res).toMatchObject({ status: 403, body: { code: "not_beneficiary" } });
  });

  it("rejects a leader-signed CreateDisbursement from a non-leader", async () => {
    const res = await call(
      createDisbursementRoute,
      await signed(stranger, "CreateDisbursement", {
        beneficiary: beneficiary.publicKey(),
        amount: "0.5",
      })
    );
    expect(res).toMatchObject({ status: 403, body: { code: "not_leader" } });
  });

  it("lets the leader cancel a pending disbursement, and no one else", async () => {
    const { id } = (await disburse("0.5")).body.disbursement;
    const byOther = await call(
      cancelRoute,
      await signed(leaderB, "CancelDisbursement", { disbursementId: id })
    );
    expect(byOther).toMatchObject({ status: 404 });

    const cancelled = await call(
      cancelRoute,
      await signed(leaderA, "CancelDisbursement", { disbursementId: id })
    );
    expect(cancelled).toMatchObject({
      status: 200,
      body: { disbursement: { status: "cancelled" } },
    });
  });

  it("does not redeem twice", async () => {
    const { id } = (await disburse("0.5")).body.disbursement;
    await call(redeemRoute, redeemBody(beneficiary, id));
    const again = await call(redeemRoute, redeemBody(beneficiary, id));
    expect(again).toMatchObject({ status: 409, body: { code: "not_redeemable" } });
    expect(payments.sendXlm).toHaveBeenCalledTimes(1);
  });
});
