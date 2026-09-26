import { db, withTransaction } from "@/lib/db";
import { beneficiaries, disbursements, leaderAllowanceCredits } from "@/lib/db/schema";
import { stroopsToXlm, xlmToStroops } from "@/lib/stellar/amount";
import { StellarTxError } from "@/lib/stellar/network";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { Address } from "viem";

// =====================================================
// LIMITS
// =====================================================

export type DisbursementLimits = {
  maxPerDisbursement: bigint; // stroops
  maxPerLeaderPerDay: bigint; // stroops, rolling 24 hours
  startingAllowance: bigint; // stroops, per leader before any admin credit
  treasuryReserve: bigint; // stroops kept back for fees and the account minimum
};

/** From env (XLM amounts); defaults are the agreed demo limits: 1 / 10 / 100 XLM. */
export function getDisbursementLimits(): DisbursementLimits {
  const read = (name: string, fallback: string) => xlmToStroops(process.env[name] || fallback);
  return {
    maxPerDisbursement: read("DISBURSE_MAX_PER_TX", "1"),
    maxPerLeaderPerDay: read("DISBURSE_MAX_PER_DAY", "10"),
    startingAllowance: read("DISBURSE_STARTING_ALLOWANCE", "100"),
    treasuryReserve: read("DISBURSE_TREASURY_RESERVE", "5"),
  };
}

export type DisbursementErrorCode =
  | "beneficiary_not_found"
  | "exceeds_per_disbursement"
  | "exceeds_daily_limit"
  | "insufficient_allowance"
  | "insufficient_treasury"
  | "disbursement_not_found"
  | "not_redeemable"
  | "payment_failed"
  | "payment_unconfirmed";

export class DisbursementError extends Error {
  constructor(
    readonly code: DisbursementErrorCode,
    message: string
  ) {
    super(message);
    this.name = "DisbursementError";
  }

  get status(): number {
    switch (this.code) {
      case "beneficiary_not_found":
      case "disbursement_not_found":
        return 404;
      case "not_redeemable":
        return 409;
      case "payment_failed":
      case "payment_unconfirmed":
        return 502;
      default:
        return 422;
    }
  }
}

// =====================================================
// RESPONSES
// =====================================================

export type DisbursementResponse = {
  id: string;
  beneficiaryEthAddress: string;
  stellarAddress: string;
  amount: string; // XLM
  status: (typeof disbursements.$inferSelect)["status"];
  txHash: string | null;
  createdAt: string;
  redeemedAt: string | null;
};

export type AllowanceResponse = {
  balance: string; // XLM the leader can still disburse
  usedLast24h: string;
  maxPerDisbursement: string;
  maxPerLeaderPerDay: string;
};

const disbursementColumns = {
  id: disbursements.id,
  beneficiaryEthAddress: beneficiaries.eth_address,
  stellarAddress: beneficiaries.stellar_address,
  amount: disbursements.amount,
  status: disbursements.status,
  txHash: disbursements.tx_hash,
  createdAt: disbursements.created_at,
  redeemedAt: disbursements.redeemed_at,
};

function toResponse(row: {
  id: string;
  beneficiaryEthAddress: string;
  stellarAddress: string;
  amount: string;
  status: DisbursementResponse["status"];
  txHash: string | null;
  createdAt: Date;
  redeemedAt: Date | null;
}): DisbursementResponse {
  return {
    ...row,
    amount: stroopsToXlm(xlmToStroops(row.amount)),
    createdAt: row.createdAt.toISOString(),
    redeemedAt: row.redeemedAt?.toISOString() ?? null,
  };
}

// =====================================================
// ALLOWANCE
// =====================================================

type Executor = Parameters<Parameters<typeof withTransaction>[0]>[0];

const sumXlm = (column: unknown) => sql<string>`coalesce(sum(${column}), 0)::text`;

async function leaderTotals(executor: Executor, leader: Address) {
  const [spent] = await executor
    .select({
      last24h: sql<string>`coalesce(sum(${disbursements.amount}) filter (where ${disbursements.created_at} > now() - interval '24 hours'), 0)::text`,
      total: sumXlm(disbursements.amount),
    })
    .from(disbursements)
    .where(eq(disbursements.leader_address, leader));
  const [credits] = await executor
    .select({ total: sumXlm(leaderAllowanceCredits.amount) })
    .from(leaderAllowanceCredits)
    .where(eq(leaderAllowanceCredits.leader_address, leader));

  return {
    last24h: xlmToStroops(spent.last24h),
    disbursed: xlmToStroops(spent.total),
    credits: xlmToStroops(credits.total),
  };
}

export async function getAllowance(
  leader: Address,
  limits = getDisbursementLimits()
): Promise<AllowanceResponse> {
  const totals = await leaderTotals(db as unknown as Executor, leader);
  return {
    balance: stroopsToXlm(limits.startingAllowance + totals.credits - totals.disbursed),
    usedLast24h: stroopsToXlm(totals.last24h),
    maxPerDisbursement: stroopsToXlm(limits.maxPerDisbursement),
    maxPerLeaderPerDay: stroopsToXlm(limits.maxPerLeaderPerDay),
  };
}

// =====================================================
// NETWORK TOTALS (public, aggregate only)
// =====================================================

export type DisbursementTotals = {
  outstanding: string; // XLM promised but not yet paid
  count: Record<DisbursementResponse["status"], number>;
};

export async function getDisbursementTotals(): Promise<DisbursementTotals> {
  const rows = await db
    .select({
      status: disbursements.status,
      n: sql<number>`count(*)::int`,
      total: sumXlm(disbursements.amount),
    })
    .from(disbursements)
    .groupBy(disbursements.status);

  const count = {
    pending: 0,
    redeeming: 0,
    redeemed: 0,
    needs_review: 0,
  } as DisbursementTotals["count"];
  let outstanding = BigInt(0);
  for (const row of rows) {
    count[row.status] = row.n;
    if (row.status !== "redeemed") outstanding += xlmToStroops(row.total);
  }
  return { outstanding: stroopsToXlm(outstanding), count };
}

// =====================================================
// CREATE
// =====================================================

// Serializes disbursement creation, so concurrent requests cannot both pass the limits
const CREATE_LOCK_KEY = 7_301_001;

/**
 * Creates a pending disbursement from `leader` (already verified) to one of their own
 * beneficiaries, after checking every limit inside one locked transaction.
 * `treasuryBalance` (stroops) is read from the network by the caller, outside the lock.
 */
export async function createDisbursement(
  input: { leader: Address; beneficiary: Address; amount: string; treasuryBalance: bigint },
  limits = getDisbursementLimits()
): Promise<DisbursementResponse> {
  const amount = xlmToStroops(input.amount);

  return withTransaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${CREATE_LOCK_KEY})`);

    const [beneficiary] = await tx
      .select()
      .from(beneficiaries)
      .where(
        and(
          eq(beneficiaries.eth_address, input.beneficiary),
          eq(beneficiaries.added_by, input.leader)
        )
      )
      .limit(1);
    if (!beneficiary) {
      throw new DisbursementError("beneficiary_not_found", "Not one of your beneficiaries");
    }

    if (amount > limits.maxPerDisbursement) {
      throw new DisbursementError(
        "exceeds_per_disbursement",
        `A disbursement can be at most ${stroopsToXlm(limits.maxPerDisbursement)} XLM`
      );
    }

    const totals = await leaderTotals(tx, input.leader);
    if (totals.last24h + amount > limits.maxPerLeaderPerDay) {
      throw new DisbursementError(
        "exceeds_daily_limit",
        `You can disburse at most ${stroopsToXlm(limits.maxPerLeaderPerDay)} XLM per 24 hours ` +
          `(${stroopsToXlm(totals.last24h)} XLM used)`
      );
    }
    const balance = limits.startingAllowance + totals.credits - totals.disbursed;
    if (amount > balance) {
      throw new DisbursementError(
        "insufficient_allowance",
        `Your remaining allowance is ${stroopsToXlm(balance)} XLM`
      );
    }

    // Everything not yet paid must stay covered by the treasury
    const [outstanding] = await tx
      .select({ total: sumXlm(disbursements.amount) })
      .from(disbursements)
      .where(inArray(disbursements.status, ["pending", "redeeming", "needs_review"]));
    const available = input.treasuryBalance - limits.treasuryReserve;
    if (xlmToStroops(outstanding.total) + amount > available) {
      throw new DisbursementError(
        "insufficient_treasury",
        "The treasury cannot cover this disbursement right now"
      );
    }

    const [created] = await tx
      .insert(disbursements)
      .values({
        beneficiary_id: beneficiary.id,
        leader_address: input.leader,
        amount: stroopsToXlm(amount),
      })
      .returning();

    return toResponse({
      id: created.id,
      beneficiaryEthAddress: beneficiary.eth_address,
      stellarAddress: beneficiary.stellar_address,
      amount: created.amount,
      status: created.status,
      txHash: created.tx_hash,
      createdAt: created.created_at,
      redeemedAt: created.redeemed_at,
    });
  });
}

// =====================================================
// LIST
// =====================================================

export async function listDisbursementsByLeader(leader: Address, limit = 50) {
  const rows = await db
    .select(disbursementColumns)
    .from(disbursements)
    .innerJoin(beneficiaries, eq(disbursements.beneficiary_id, beneficiaries.id))
    .where(eq(disbursements.leader_address, leader))
    .orderBy(desc(disbursements.created_at))
    .limit(limit);
  return rows.map(toResponse);
}

export async function listDisbursementsByBeneficiary(beneficiary: Address) {
  const rows = await db
    .select(disbursementColumns)
    .from(disbursements)
    .innerJoin(beneficiaries, eq(disbursements.beneficiary_id, beneficiaries.id))
    .where(eq(beneficiaries.eth_address, beneficiary))
    .orderBy(desc(disbursements.created_at));
  return rows.map(toResponse);
}

// =====================================================
// REDEEM
// =====================================================

export type StellarPaymentOps = {
  walletExists: (contractId: string) => Promise<boolean>;
  deployWallet: (ethAddress: string) => Promise<string>;
  sendXlm: (to: string, stroops: bigint) => Promise<string>;
};

async function setStatus(
  id: string,
  values: Partial<typeof disbursements.$inferInsert>,
  from: DisbursementResponse["status"]
) {
  await db
    .update(disbursements)
    .set(values)
    .where(and(eq(disbursements.id, id), eq(disbursements.status, from)));
}

/**
 * Pays out a pending disbursement to `beneficiary` (already verified), deploying their
 * Stellar wallet first if needed.
 *
 * The row is claimed (pending → redeeming) with a conditional update, so two concurrent
 * requests cannot both pay. If the payment's outcome is unknown, the row is parked as
 * needs_review instead of returning to pending, so it is never paid twice.
 */
export async function redeemDisbursement(
  input: { beneficiary: Address; disbursementId: string },
  ops: StellarPaymentOps
): Promise<DisbursementResponse> {
  const owned = inArray(
    disbursements.beneficiary_id,
    db
      .select({ id: beneficiaries.id })
      .from(beneficiaries)
      .where(eq(beneficiaries.eth_address, input.beneficiary))
  );

  const [claimed] = await db
    .update(disbursements)
    .set({ status: "redeeming", last_error: null })
    .where(
      and(eq(disbursements.id, input.disbursementId), eq(disbursements.status, "pending"), owned)
    )
    .returning({ id: disbursements.id, amount: disbursements.amount });

  if (!claimed) {
    const [existing] = await db
      .select({ status: disbursements.status })
      .from(disbursements)
      .where(and(eq(disbursements.id, input.disbursementId), owned))
      .limit(1);
    if (!existing) {
      throw new DisbursementError("disbursement_not_found", "Disbursement not found");
    }
    throw new DisbursementError("not_redeemable", `This disbursement is ${existing.status}`);
  }

  const [{ stellarAddress }] = await db
    .select({ stellarAddress: beneficiaries.stellar_address })
    .from(beneficiaries)
    .where(eq(beneficiaries.eth_address, input.beneficiary));

  // Before any funds move: on failure, hand the disbursement back as pending
  try {
    if (!(await ops.walletExists(stellarAddress))) {
      await ops.deployWallet(input.beneficiary);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await setStatus(input.disbursementId, { status: "pending", last_error: message }, "redeeming");
    throw new DisbursementError(
      "payment_failed",
      `Could not set up your Stellar wallet: ${message}`
    );
  }

  let txHash: string;
  try {
    txHash = await ops.sendXlm(stellarAddress, xlmToStroops(claimed.amount));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof StellarTxError && error.outcome !== "unknown") {
      await setStatus(
        input.disbursementId,
        { status: "pending", last_error: message },
        "redeeming"
      );
      throw new DisbursementError("payment_failed", `The payment failed: ${message}`);
    }
    await setStatus(
      input.disbursementId,
      {
        status: "needs_review",
        last_error: message,
        tx_hash: error instanceof StellarTxError ? (error.txHash ?? null) : null,
      },
      "redeeming"
    );
    throw new DisbursementError(
      "payment_unconfirmed",
      "The payment was sent but not confirmed yet; it will be checked before any retry"
    );
  }

  try {
    await setStatus(
      input.disbursementId,
      { status: "redeemed", tx_hash: txHash, redeemed_at: new Date(), last_error: null },
      "redeeming"
    );
  } catch (error) {
    // Paid, but not recorded: park it for review rather than risk paying again
    await setStatus(
      input.disbursementId,
      { status: "needs_review", tx_hash: txHash, last_error: "Paid; failed to record" },
      "redeeming"
    ).catch(() => {});
    throw error;
  }

  const [row] = await db
    .select(disbursementColumns)
    .from(disbursements)
    .innerJoin(beneficiaries, eq(disbursements.beneficiary_id, beneficiaries.id))
    .where(eq(disbursements.id, input.disbursementId));
  return toResponse(row);
}
