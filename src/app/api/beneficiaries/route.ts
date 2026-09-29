import {
  BeneficiaryConflictError,
  addBeneficiary,
  toBeneficiaryResponse,
} from "@/lib/beneficiaries";
import { verifyLeaderAction } from "@/lib/leader-auth";
import { leaderActionErrorResponse, readSignedBody } from "@/lib/leader-auth/http";
import { NextRequest, NextResponse } from "next/server";

/**
 * Add a beneficiary. Body: { message: AddBeneficiary, signature } signed by a current leader.
 * The beneficiary is visible only to that leader.
 */
export async function POST(request: NextRequest) {
  try {
    const { message, signature } = await readSignedBody(request);
    const { leader, message: action } = await verifyLeaderAction({
      primaryType: "AddBeneficiary",
      message,
      signature,
    });

    const beneficiary = await addBeneficiary(leader, action.beneficiary);
    return NextResponse.json({ beneficiary: toBeneficiaryResponse(beneficiary) }, { status: 201 });
  } catch (error) {
    if (error instanceof BeneficiaryConflictError) {
      return NextResponse.json(
        { error: error.message, code: "already_registered" },
        { status: 409 }
      );
    }
    return leaderActionErrorResponse(error, "POST /api/beneficiaries");
  }
}
