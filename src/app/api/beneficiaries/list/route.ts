import { toBeneficiaryResponse } from "@/lib/beneficiaries";
import { DB } from "@/lib/database/service";
import { getAllowance, listDisbursementsByLeader } from "@/lib/disbursements";
import { verifyLeaderAction } from "@/lib/signed-actions";
import { signedActionErrorResponse, readSignedBody } from "@/lib/signed-actions/http";
import { NextRequest, NextResponse } from "next/server";

/**
 * List the signing leader's beneficiaries, their recent disbursements and allowance. Body: { message: ListBeneficiaries, signature }.
 * POST rather than GET because the request carries a signature; the signature is read-only
 * and may be reused until it expires.
 */
export async function POST(request: NextRequest) {
  try {
    const { message, signature } = await readSignedBody(request);
    const { leader } = await verifyLeaderAction({
      primaryType: "ListBeneficiaries",
      message,
      signature,
    });

    const [beneficiaries, disbursements, allowance] = await Promise.all([
      DB.listBeneficiariesByLeader(leader),
      listDisbursementsByLeader(leader),
      getAllowance(leader),
    ]);
    return NextResponse.json({
      beneficiaries: beneficiaries.map(toBeneficiaryResponse),
      disbursements,
      allowance,
    });
  } catch (error) {
    return signedActionErrorResponse(error, "POST /api/beneficiaries/list");
  }
}
