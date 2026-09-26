import { listDisbursementsByBeneficiary } from "@/lib/disbursements";
import { getStellarSessionAccount } from "@/lib/session";
import { signedActionErrorResponse } from "@/lib/signed-actions/http";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * The signed-in Stellar account's disbursements (empty if it is not a beneficiary). Needs a
 * Stellar session (see /api/session/stellar).
 */
export async function GET(request: NextRequest) {
  try {
    const beneficiary = getStellarSessionAccount(request);
    if (!beneficiary) {
      return NextResponse.json({ error: "Sign in first", code: "no_session" }, { status: 401 });
    }
    return NextResponse.json({ disbursements: await listDisbursementsByBeneficiary(beneficiary) });
  } catch (error) {
    return signedActionErrorResponse(error, "GET /api/disbursements/mine");
  }
}
