import {
  getCompletionsCount,
  getHatsWearersCount,
  getInvitationsCount,
  getRelayerBalance,
  getReservedInvitesCount,
} from "@/app/actions/dashboard";
import { NextRequest, NextResponse } from "next/server";

// Force static generation for mobile builds
export const dynamic = "force-static";

export async function GET(request: NextRequest) {
  try {
    const results: any = {};

    // Execute each function individually with error handling
    try {
      results.completions = await getCompletionsCount();
    } catch (error) {
      console.error("Error getting completions count:", error);
      results.completions = { error: "Failed to fetch completions count" };
    }

    try {
      results.reservedInvites = await getReservedInvitesCount();
    } catch (error) {
      console.error("Error getting reserved invites count:", error);
      results.reservedInvites = { error: "Failed to fetch reserved invites count" };
    }

    try {
      results.invitations = await getInvitationsCount();
    } catch (error) {
      console.error("Error getting invitations count:", error);
      results.invitations = { error: "Failed to fetch invitations count" };
    }

    try {
      results.relayerBalance = await getRelayerBalance();
    } catch (error) {
      console.error("Error getting relayer balance:", error);
      results.relayerBalance = { error: "Failed to fetch relayer balance" };
    }

    try {
      results.hatsWearers = await getHatsWearersCount();
    } catch (error) {
      console.error("Error getting hats wearers count:", error);
      results.hatsWearers = { error: "Failed to fetch hats wearers count" };
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("General error in metrics endpoint:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
