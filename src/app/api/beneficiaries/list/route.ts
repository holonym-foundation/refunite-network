import { toBeneficiaryResponse } from "@/lib/beneficiaries";
import { DB } from "@/lib/database/service";
import { verifyLeaderAction } from "@/lib/leader-auth";
import { leaderActionErrorResponse, readSignedBody } from "@/lib/leader-auth/http";
import { NextRequest, NextResponse } from "next/server";

/**
 * List the signing leader's beneficiaries. Body: { message: ListBeneficiaries, signature }.
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

    const beneficiaries = await DB.listBeneficiariesByLeader(leader);
    return NextResponse.json({ beneficiaries: beneficiaries.map(toBeneficiaryResponse) });
  } catch (error) {
    return leaderActionErrorResponse(error, "POST /api/beneficiaries/list");
  }
}
