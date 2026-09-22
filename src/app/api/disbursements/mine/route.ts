import { listDisbursementsByBeneficiary } from "@/lib/disbursements";
import { getSessionAddress } from "@/lib/session";
import { signedActionErrorResponse } from "@/lib/signed-actions/http";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * The signed-in wallet's disbursements (empty if it is not a beneficiary). Needs a session
 * (see /api/session).
 */
export async function GET(request: NextRequest) {
  try {
    const beneficiary = getSessionAddress(request);
    if (!beneficiary) {
      return NextResponse.json({ error: "Sign in first", code: "no_session" }, { status: 401 });
    }
    return NextResponse.json({ disbursements: await listDisbursementsByBeneficiary(beneficiary) });
  } catch (error) {
    return signedActionErrorResponse(error, "GET /api/disbursements/mine");
  }
}
