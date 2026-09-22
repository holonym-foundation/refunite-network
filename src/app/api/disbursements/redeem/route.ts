import { redeemDisbursement } from "@/lib/disbursements";
import { verifyBeneficiaryAction } from "@/lib/signed-actions";
import { readSignedBody, signedActionErrorResponse } from "@/lib/signed-actions/http";
import { stellarPaymentOps } from "@/lib/stellar/network";
import { NextRequest, NextResponse } from "next/server";

// May deploy a wallet and then pay, each waiting for Stellar confirmation
export const maxDuration = 60;

/**
 * Redeem one of your disbursements. Body: { message: RedeemDisbursement, signature } signed by
 * the beneficiary. Deploys their Stellar wallet if needed, then sends the XLM.
 */
export async function POST(request: NextRequest) {
  try {
    const { message, signature } = await readSignedBody(request);
    const { beneficiary, message: action } = await verifyBeneficiaryAction({
      primaryType: "RedeemDisbursement",
      message,
      signature,
    });

    const disbursement = await redeemDisbursement(
      { beneficiary, disbursementId: action.disbursementId },
      stellarPaymentOps()
    );
    return NextResponse.json({ disbursement });
  } catch (error) {
    return signedActionErrorResponse(error, "POST /api/disbursements/redeem");
  }
}
