import {
  getCompletionsCount,
  getHatsWearersCount,
  getInvitationsCount,
  getRelayerBalance,
  getReservedInvitesCount,
} from "@/app/actions/dashboard";
import { getDisbursementLimits, getDisbursementTotals } from "@/lib/disbursements";
import { getRelayerAddress } from "@/lib/relayer";
import { stroopsToXlm, xlmToStroops } from "@/lib/stellar/amount";
import { getStellarNetworkConfig, getTreasuryBalance } from "@/lib/stellar/network";
import { defaultChain } from "@/wagmi/chain-config";
import { NextResponse } from "next/server";

// Live numbers on every request (this used to be frozen at build time)
export const dynamic = "force-dynamic";

/** Warn on /info when the treasury's free XLM (after unpaid disbursements) drops below this. */
const LOW_TREASURY_XLM = process.env.DISBURSE_LOW_TREASURY_WARNING || "50";

/**
 * Public, aggregate network numbers for /info. Only totals and addresses that are already
 * public on-chain; no beneficiaries, leaders or amounts per person.
 */
async function treasuryInfo() {
  const config = getStellarNetworkConfig();
  const [balance, totals] = await Promise.all([
    getTreasuryBalance(config),
    getDisbursementTotals(),
  ]);
  const outstanding = xlmToStroops(totals.outstanding);
  const free = balance - getDisbursementLimits().treasuryReserve - outstanding;
  return {
    address: config.source.publicKey(),
    balance: stroopsToXlm(balance),
    outstanding: totals.outstanding,
    free: stroopsToXlm(free),
    low: free < xlmToStroops(LOW_TREASURY_XLM),
    disbursements: totals.count,
  };
}

export async function GET() {
  const results: Record<string, unknown> = {};

  // Each figure is independent: one failing does not hide the others
  const fields: [string, () => Promise<unknown>, string][] = [
    ["completions", getCompletionsCount, "completions count"],
    ["reservedInvites", getReservedInvitesCount, "reserved invites count"],
    ["invitations", getInvitationsCount, "invitations count"],
    ["relayerBalance", getRelayerBalance, "relayer balance"],
    ["hatsWearers", getHatsWearersCount, "hats wearers count"],
    ["treasury", treasuryInfo, "treasury"],
  ];
  await Promise.all(
    fields.map(async ([key, load, label]) => {
      try {
        results[key] = await load();
      } catch (error) {
        console.error(`Error getting ${label}:`, error);
        results[key] = { error: `Failed to fetch ${label}` };
      }
    })
  );

  try {
    const relayerAddress = getRelayerAddress();
    results.relayerAddress = relayerAddress;
    results.relayerExplorerUrl = `${defaultChain.blockExplorers?.default.url}/address/${relayerAddress}`;
  } catch (error) {
    console.error("Error getting relayer address:", error);
  }

  return NextResponse.json(results);
}
