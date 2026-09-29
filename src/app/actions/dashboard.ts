import { HATS_CONTRACT_ADDRESS, LEADER_HAT_ID } from "@/lib/constants";
import { DB } from "@/lib/database/service";
import { abi as hatsAbi } from "@/lib/hatsAbi";
import { getRelayerAddress, getRelayerClients } from "@/lib/relayer";
import { getPublicClient } from "@/lib/chain";

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
 * Fetch the number of wearers of the leader hat on the default chain
 */
export async function getHatsWearersCount() {
  const client = getPublicClient();
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
