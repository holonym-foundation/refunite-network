import {
  getCompletionsCount,
  getHatsWearersCount,
  getInvitationsCount,
  getRelayerBalance,
  getReservedInvitesCount,
} from "@/app/actions/dashboard";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const completions = await getCompletionsCount();
  const reservedInvites = await getReservedInvitesCount();
  const invitations = await getInvitationsCount();
  const relayerBalance = await getRelayerBalance();
  const hatsWearers = await getHatsWearersCount();

  return NextResponse.json({
    completions,
    reservedInvites,
    invitations,
    relayerBalance,
    hatsWearers,
  });
}
