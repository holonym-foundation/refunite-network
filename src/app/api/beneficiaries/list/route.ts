import { toBeneficiaryResponse } from "@/lib/beneficiaries";
import { getPublicClient } from "@/lib/chain";
import { DB } from "@/lib/database/service";
import { getAllowance, listDisbursementsByLeader } from "@/lib/disbursements";
import { getLeaderHatConfig, isLeader } from "@/lib/relayer";
import { getSessionAddress } from "@/lib/session";
import { signedActionErrorResponse } from "@/lib/signed-actions/http";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * The signed-in leader's beneficiaries, recent disbursements and allowance. Needs a session
 * (see /api/session); the leader hat is checked on every request.
 */
export async function GET(request: NextRequest) {
  try {
    const leader = getSessionAddress(request);
    if (!leader) {
      return NextResponse.json({ error: "Sign in first", code: "no_session" }, { status: 401 });
    }
    if (!(await isLeader(getPublicClient(), getLeaderHatConfig(), leader))) {
      return NextResponse.json(
        { error: "Signer is not a current leader", code: "not_leader" },
        { status: 403 }
      );
    }

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
    return signedActionErrorResponse(error, "GET /api/beneficiaries/list");
  }
}
