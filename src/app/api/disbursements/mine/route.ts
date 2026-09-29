import { listDisbursementsByBeneficiary } from "@/lib/disbursements";
import { verifyBeneficiaryAction } from "@/lib/signed-actions";
import { readSignedBody, signedActionErrorResponse } from "@/lib/signed-actions/http";
import { NextRequest, NextResponse } from "next/server";

/**
 * List the signing beneficiary's disbursements. Body: { message: ListMyDisbursements,
 * signature }; read-only, so the signature may be reused until it expires.
 */
export async function POST(request: NextRequest) {
  try {
    const { message, signature } = await readSignedBody(request);
    const { beneficiary } = await verifyBeneficiaryAction({
      primaryType: "ListMyDisbursements",
      message,
      signature,
    });
    return NextResponse.json({ disbursements: await listDisbursementsByBeneficiary(beneficiary) });
  } catch (error) {
    return signedActionErrorResponse(error, "POST /api/disbursements/mine");
  }
}
