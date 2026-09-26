import { NextRequest, NextResponse } from "next/server";
import { validateApiToken } from "@/lib/utils/api-auth";
import { DB } from "@/lib/database/service";
import { reconcileDisbursements } from "@/lib/disbursements";
import { stellarPaymentOps } from "@/lib/stellar/network";

// Reconciling looks transactions up on Stellar
export const maxDuration = 60;

/** Settles disbursements stuck mid-payment; skipped (not failed) if Stellar is not configured. */
async function reconcile() {
  let ops;
  try {
    ops = stellarPaymentOps();
  } catch (error) {
    console.warn("Skipping disbursement reconcile:", (error as Error).message);
    return null;
  }
  const summary = await reconcileDisbursements(ops);
  if (summary.redeemed || summary.returnedToPending || summary.leftForReview) {
    console.log("Reconciled disbursements", summary);
  }
  return summary;
}

async function performCleanup() {
  // Clean up expired reservations using database service
  const cleanedCount = await DB.cleanupExpiredReservations();

  // Log audit event for cleanup
  if (cleanedCount > 0) {
    await DB.logAudit({
      entity_type: "reservation",
      entity_id: 0, // System action, no specific entity
      action: "expire",
      actor_address: null,
      metadata: { cleaned_count: cleanedCount, cleanup_type: "automatic" },
    });
  }

  console.log(`Cleaned up ${cleanedCount} expired reservations`);

  return {
    success: true,
    cleanedCount,
    disbursements: await reconcile(),
    cleanupTime: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  // Vercel Functions triggered by a cron job on Vercel will always contain vercel-cron/1.0 as the user agent.
  // https://vercel.com/docs/cron-jobs
  try {
    const userAgent = request.headers.get("user-agent");
    if (!userAgent || !userAgent.includes("vercel-cron/1.0")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // For cron jobs, we don't require authentication since Vercel handles security
    const result = await performCleanup();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/system/cleanup (GET):", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check bearer token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    if (!validateApiToken(token)) {
      console.error("Unauthorized token used in call to /api/system/cleanup");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await performCleanup();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/system/cleanup (POST):", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
