import { cancelDisbursement } from "@/lib/disbursements";
import { verifyLeaderAction } from "@/lib/signed-actions";
import { readSignedBody, signedActionErrorResponse } from "@/lib/signed-actions/http";
import { NextRequest, NextResponse } from "next/server";

/**
 * Cancel one of your pending disbursements. Body: { message: CancelDisbursement, signature }
 * signed by the leader who created it. The amount returns to their allowance.
 */
export async function POST(request: NextRequest) {
  try {
    const { message, signature } = await readSignedBody(request);
    const { leader, message: action } = await verifyLeaderAction({
      primaryType: "CancelDisbursement",
      message,
      signature,
    });
    const disbursement = await cancelDisbursement({
      leader,
      disbursementId: action.disbursementId,
    });
    return NextResponse.json({ disbursement });
  } catch (error) {
    return signedActionErrorResponse(error, "POST /api/disbursements/cancel");
  }
}
