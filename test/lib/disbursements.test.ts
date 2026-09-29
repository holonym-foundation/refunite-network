// @vitest-environment node
import { DB } from "@/lib/database/service";
import { db } from "@/lib/db";
import { disbursements, leaderAllowanceCredits } from "@/lib/db/schema";
import {
  DisbursementLimits,
  StellarPaymentOps,
  createDisbursement,
  getAllowance,
  getDisbursementLimits,
  listDisbursementsByBeneficiary,
  listDisbursementsByLeader,
  redeemDisbursement,
} from "@/lib/disbursements";
import { xlmToStroops } from "@/lib/stellar/amount";
import { StellarTxError } from "@/lib/stellar/network";
import { eq, sql } from "drizzle-orm";
import { getAddress } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => import("../helpers/db").then((m) => m.createTestDbModule()));

const LEADER = getAddress("0x3333333333333333333333333333333333333333");
const OTHER_LEADER = getAddress("0x4444444444444444444444444444444444444444");
const BENEFICIARY = getAddress("0x1111111111111111111111111111111111111111");
const OTHER_BENEFICIARY = getAddress("0x2222222222222222222222222222222222222222");
const STELLAR = "CBENEFICIARYWALLET";
const TREASURY = xlmToStroops("1000");

const create = (
  amount: string,
  overrides: Partial<Parameters<typeof createDisbursement>[0]> = {},
  limits?: DisbursementLimits
) =>
  createDisbursement(
    { leader: LEADER, beneficiary: BENEFICIARY, amount, treasuryBalance: TREASURY, ...overrides },
    limits
  );

function paymentOps(overrides: Partial<StellarPaymentOps> = {}) {
  return {
    walletExists: vi.fn(async () => true),
    deployWallet: vi.fn(async () => "deploy-hash"),
    sendXlm: vi.fn(async () => `pay-${Math.random()}`),
    ...overrides,
  } satisfies StellarPaymentOps;
}

async function status(id: string) {
  const [row] = await db.select().from(disbursements).where(eq(disbursements.id, id));
  return row;
}

beforeEach(async () => {
  await db.execute(sql`TRUNCATE disbursements, leader_allowance_credits, beneficiaries CASCADE`);
  await DB.createBeneficiary({
    eth_address: BENEFICIARY,
    stellar_address: STELLAR,
    added_by: LEADER,
  });
  await DB.createBeneficiary({
    eth_address: OTHER_BENEFICIARY,
    stellar_address: "COTHERWALLET",
    added_by: OTHER_LEADER,
  });
});

describe("limits", () => {
  it("defaults to 1 XLM per disbursement, 10 per day, 100 allowance", () => {
    expect(getDisbursementLimits()).toMatchObject({
      maxPerDisbursement: xlmToStroops("1"),
      maxPerLeaderPerDay: xlmToStroops("10"),
      startingAllowance: xlmToStroops("100"),
    });
  });
});

describe("createDisbursement", () => {
  it("creates a pending disbursement to the leader's own beneficiary", async () => {
    const d = await create("0.5");
    expect(d).toMatchObject({
      beneficiaryEthAddress: BENEFICIARY,
      stellarAddress: STELLAR,
      amount: "0.5",
      status: "pending",
      txHash: null,
    });
  });

  it("rejects a beneficiary added by another leader", async () => {
    await expect(create("0.5", { beneficiary: OTHER_BENEFICIARY })).rejects.toMatchObject({
      code: "beneficiary_not_found",
      status: 404,
    });
  });

  it("rejects more than 1 XLM in one disbursement", async () => {
    await expect(create("1.0000001")).rejects.toMatchObject({ code: "exceeds_per_disbursement" });
    await expect(create("1")).resolves.toMatchObject({ amount: "1" });
  });

  it("allows at most 10 XLM per leader per 24 hours", async () => {
    for (let i = 0; i < 10; i++) await create("1");
    await expect(create("0.0000001")).rejects.toMatchObject({ code: "exceeds_daily_limit" });
  });

  it("does not count disbursements older than 24 hours towards the daily limit", async () => {
    for (let i = 0; i < 10; i++) await create("1");
    await db.update(disbursements).set({ created_at: sql`now() - interval '25 hours'` });
    await expect(create("1")).resolves.toMatchObject({ status: "pending" });
  });

  it("enforces the allowance, and admin credits raise it", async () => {
    const limits = { ...getDisbursementLimits(), startingAllowance: xlmToStroops("2") };
    await create("1", {}, limits);
    await create("1", {}, limits);
    await expect(create("0.5", {}, limits)).rejects.toMatchObject({
      code: "insufficient_allowance",
    });

    await db.insert(leaderAllowanceCredits).values({ leader_address: LEADER, amount: "0.5" });
    await expect(create("0.5", {}, limits)).resolves.toMatchObject({ amount: "0.5" });
  });

  it("keeps unpaid disbursements covered by the treasury, minus the reserve", async () => {
    const treasuryBalance = xlmToStroops("6"); // 5 XLM reserve leaves 1 XLM available
    await create("0.6", { treasuryBalance });
    await expect(create("0.5", { treasuryBalance })).rejects.toMatchObject({
      code: "insufficient_treasury",
    });
    await expect(create("0.4", { treasuryBalance })).resolves.toBeTruthy();
  });

  it("never lets concurrent requests exceed the daily limit", async () => {
    const results = await Promise.allSettled(Array.from({ length: 12 }, () => create("1")));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(10);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(2);
  });
});

describe("allowance and lists", () => {
  it("reports the remaining allowance and 24h usage", async () => {
    await create("1");
    await create("0.25");
    expect(await getAllowance(LEADER)).toEqual({
      balance: "98.75",
      usedLast24h: "1.25",
      maxPerDisbursement: "1",
      maxPerLeaderPerDay: "10",
    });
  });

  it("lists disbursements per leader and per beneficiary", async () => {
    const d = await create("0.5");
    expect((await listDisbursementsByLeader(LEADER)).map((x) => x.id)).toEqual([d.id]);
    expect(await listDisbursementsByLeader(OTHER_LEADER)).toEqual([]);
    expect((await listDisbursementsByBeneficiary(BENEFICIARY)).map((x) => x.id)).toEqual([d.id]);
    expect(await listDisbursementsByBeneficiary(OTHER_BENEFICIARY)).toEqual([]);
  });
});

describe("redeemDisbursement", () => {
  const redeem = (id: string, ops: StellarPaymentOps, beneficiary = BENEFICIARY) =>
    redeemDisbursement({ beneficiary, disbursementId: id }, ops);

  it("deploys the wallet if needed, pays, and records the transaction", async () => {
    const d = await create("0.5");
    const ops = paymentOps({
      walletExists: vi.fn(async () => false),
      sendXlm: vi.fn(async () => "pay-hash"),
    });

    const redeemed = await redeem(d.id, ops);

    expect(ops.deployWallet).toHaveBeenCalledWith(BENEFICIARY);
    expect(ops.sendXlm).toHaveBeenCalledWith(STELLAR, xlmToStroops("0.5"));
    expect(redeemed).toMatchObject({ status: "redeemed", txHash: "pay-hash" });
    expect(redeemed.redeemedAt).not.toBeNull();
  });

  it("skips deployment for an existing wallet", async () => {
    const d = await create("0.5");
    const ops = paymentOps();
    await redeem(d.id, ops);
    expect(ops.deployWallet).not.toHaveBeenCalled();
  });

  it("pays only once", async () => {
    const d = await create("0.5");
    const ops = paymentOps();
    await redeem(d.id, ops);
    await expect(redeem(d.id, ops)).rejects.toMatchObject({ code: "not_redeemable", status: 409 });
    expect(ops.sendXlm).toHaveBeenCalledTimes(1);
  });

  it("pays only once under concurrent redeems", async () => {
    const d = await create("0.5");
    const ops = paymentOps();
    const results = await Promise.allSettled([
      redeem(d.id, ops),
      redeem(d.id, ops),
      redeem(d.id, ops),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(ops.sendXlm).toHaveBeenCalledTimes(1);
  });

  it("does not let another beneficiary redeem it", async () => {
    const d = await create("0.5");
    await expect(redeem(d.id, paymentOps(), OTHER_BENEFICIARY)).rejects.toMatchObject({
      code: "disbursement_not_found",
    });
    expect((await status(d.id)).status).toBe("pending");
  });

  it("returns to pending when the payment fails before funds move, so it can be retried", async () => {
    const d = await create("0.5");
    const failing = paymentOps({
      sendXlm: vi.fn(async () => {
        throw new StellarTxError("failed", "tx failed on-chain", "failed-hash");
      }),
    });

    await expect(redeem(d.id, failing)).rejects.toMatchObject({ code: "payment_failed" });
    expect(await status(d.id)).toMatchObject({
      status: "pending",
      last_error: "tx failed on-chain",
    });

    await expect(redeem(d.id, paymentOps())).resolves.toMatchObject({ status: "redeemed" });
  });

  it("returns to pending when the wallet deployment fails", async () => {
    const d = await create("0.5");
    const ops = paymentOps({
      walletExists: vi.fn(async () => false),
      deployWallet: vi.fn(async () => {
        throw new Error("deploy failed");
      }),
    });
    await expect(redeem(d.id, ops)).rejects.toMatchObject({ code: "payment_failed" });
    expect(ops.sendXlm).not.toHaveBeenCalled();
    expect((await status(d.id)).status).toBe("pending");
  });

  it("parks an unconfirmed payment for review and never retries it", async () => {
    const d = await create("0.5");
    const unconfirmed = paymentOps({
      sendXlm: vi.fn(async () => {
        throw new StellarTxError("unknown", "not confirmed in time", "maybe-hash");
      }),
    });

    await expect(redeem(d.id, unconfirmed)).rejects.toMatchObject({ code: "payment_unconfirmed" });
    expect(await status(d.id)).toMatchObject({ status: "needs_review", tx_hash: "maybe-hash" });

    const retry = paymentOps();
    await expect(redeem(d.id, retry)).rejects.toMatchObject({ code: "not_redeemable" });
    expect(retry.sendXlm).not.toHaveBeenCalled();
  });

  it("treats an unexpected payment error as unconfirmed", async () => {
    const d = await create("0.5");
    const ops = paymentOps({
      sendXlm: vi.fn(async () => {
        throw new Error("socket hang up");
      }),
    });
    await expect(redeem(d.id, ops)).rejects.toMatchObject({ code: "payment_unconfirmed" });
    expect((await status(d.id)).status).toBe("needs_review");
  });
});
