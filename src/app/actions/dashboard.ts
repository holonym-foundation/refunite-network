import { HATS_CONTRACT_ADDRESS, LEADER_HAT_ID } from "@/lib/constants";
import { DB } from "@/lib/database/service";
import { abi as hatsAbi } from "@/lib/hatsAbi";
import { getRelayerAddress, getRelayerClients } from "@/lib/relayer";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";

/**
 * Fetch count of successful onboardings (completions)
 */
export async function getCompletionsCount() {
  return DB.countCompletions();
}

/**
 * Fetch count of reserved invites (active reservations)
 */
export async function getReservedInvitesCount() {
  return DB.countReservedInvites();
}

/**
 * Fetch count of total invites
 */
export async function getInvitationsCount() {
  return DB.countInvitations();
}

/**
 * Fetch the relayer wallet's native balance on the default chain
 */
export async function getRelayerBalance() {
  const { publicClient } = getRelayerClients();
  const balance = await publicClient.getBalance({ address: getRelayerAddress() });
  return balance.toString(); // Return as string (wei)
}

/**
 * Fetch the number of wearers for a specific hat (tree 22)
 * Assumes hatId is 22 (as per dashboard spec)
 */
export async function getHatsWearersCount() {
  const client = createPublicClient({ chain: celo, transport: http() });
  const hatId = LEADER_HAT_ID;
  // The function to call is likely 'hatSupply' (returns current supply for a hatId)
  const supply = await client.readContract({
    address: HATS_CONTRACT_ADDRESS as `0x${string}`,
    abi: hatsAbi,
    functionName: "hatSupply",
    args: [BigInt(hatId as string)],
  });
  return Number(supply);
}
