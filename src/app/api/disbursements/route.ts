import { createDisbursement } from "@/lib/disbursements";
import { verifyLeaderAction } from "@/lib/signed-actions";
import { readSignedBody, signedActionErrorResponse } from "@/lib/signed-actions/http";
import {
  StellarConfigError,
  accountExists,
  getStellarNetworkConfig,
  getTreasuryBalance,
} from "@/lib/stellar/network";
import { NextRequest, NextResponse } from "next/server";

/**
 * Create a disbursement. Body: { message: CreateDisbursement, signature } signed by a leader,
 * to one of their own beneficiaries, within the per-disbursement, daily and allowance limits.
 * Nothing is paid yet: the beneficiary redeems it.
 */
export async function POST(request: NextRequest) {
  try {
    const { message, signature } = await readSignedBody(request);
    const { leader, message: action } = await verifyLeaderAction({
      primaryType: "CreateDisbursement",
      message,
      signature,
    });

    let treasuryBalance: bigint;
    let beneficiaryAccountExists: boolean;
    try {
      const config = getStellarNetworkConfig();
      [treasuryBalance, beneficiaryAccountExists] = await Promise.all([
        getTreasuryBalance(config),
        accountExists(config, action.beneficiary),
      ]);
    } catch (error) {
      if (error instanceof StellarConfigError) throw error;
      console.error("Could not read the treasury or the beneficiary account", error);
      return NextResponse.json(
        {
          error: "The Stellar network is unavailable, try again shortly",
          code: "stellar_unavailable",
        },
        { status: 503 }
      );
    }

    const disbursement = await createDisbursement({
      leader,
      beneficiary: action.beneficiary,
      amount: action.amount,
      treasuryBalance,
      beneficiaryAccountExists,
    });
    return NextResponse.json({ disbursement }, { status: 201 });
  } catch (error) {
    return signedActionErrorResponse(error, "POST /api/disbursements");
  }
}
