import { HATS_CONTRACT_ADDRESS, HSG_CONTRACT_ADDRESS, LEADER_HAT_ID } from "@/lib/constants";
import { abi as hatsAbi } from "@/lib/hatsAbi";
import { defaultChain } from "@/wagmi/chain-config";
import { getAlchemyRpcUrl } from "@/wagmi/rpc";
import {
  Account,
  Address,
  Chain,
  Hash,
  Hex,
  PublicClient,
  Transport,
  WalletClient,
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  isAddress,
  parseAbi,
} from "viem";
import { nonceManager, privateKeyToAccount } from "viem/accounts";

/**
 * Server-side relayer that onboards leaders on-chain. It replaces the
 * OpenZeppelin Defender Action (Defender shut down on 2026-07-01).
 *
 * The relayer wallet (RELAYER_PRIVATE_KEY) must wear an admin hat of the
 * leader hat so it can mint it, and must hold native gas on the default chain.
 */

const hsgAbi = parseAbi(["function claimSignerFor(uint256 _hatId, address _signer)"]);

// Gas estimates for mintHat have come in too low (a Sepolia mint ran out of gas at exactly
// the estimate), so send each transaction with 25% headroom. Unused gas is not charged.
const GAS_BUFFER_PERCENT = BigInt(125);

export function withGasBuffer(estimate: bigint): bigint {
  return (estimate * GAS_BUFFER_PERCENT) / BigInt(100);
}

export type RelayerConfig = {
  hatsAddress: Address;
  hsgAddress: Address;
  leaderHatId: bigint;
};

export type RelayerClients = {
  publicClient: PublicClient;
  walletClient: WalletClient<Transport, Chain, Account>;
};

export type OnboardLeaderResult =
  | { status: "already_onboarded" }
  | { status: "onboarded"; mintHatTxHash: Hash; claimSignerTxHash: Hash };

export class RelayerConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RelayerConfigError";
  }
}

export class RelayerTransactionError extends Error {
  constructor(
    message: string,
    readonly txHash?: Hash
  ) {
    super(message);
    this.name = "RelayerTransactionError";
  }
}

export type LeaderHatConfig = Pick<RelayerConfig, "hatsAddress" | "leaderHatId">;

/** Hats contract and leader hat only; unlike getRelayerConfig, needs no HSG address. */
export function getLeaderHatConfig(): LeaderHatConfig {
  if (!LEADER_HAT_ID) {
    throw new RelayerConfigError("NEXT_PUBLIC_HATS_LEADER_ID is missing");
  }
  return { hatsAddress: getAddress(HATS_CONTRACT_ADDRESS), leaderHatId: BigInt(LEADER_HAT_ID) };
}

export function getRelayerConfig(): RelayerConfig {
  if (!HSG_CONTRACT_ADDRESS || !isAddress(HSG_CONTRACT_ADDRESS)) {
    throw new RelayerConfigError("NEXT_PUBLIC_HSG_CONTRACT_ADDRESS is missing or invalid");
  }
  if (!LEADER_HAT_ID) {
    throw new RelayerConfigError("NEXT_PUBLIC_HATS_LEADER_ID is missing");
  }

  return {
    hatsAddress: getAddress(HATS_CONTRACT_ADDRESS),
    hsgAddress: getAddress(HSG_CONTRACT_ADDRESS),
    leaderHatId: BigInt(LEADER_HAT_ID),
  };
}

function getRelayerAccount() {
  const privateKey = process.env.RELAYER_PRIVATE_KEY;
  if (!privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new RelayerConfigError("RELAYER_PRIVATE_KEY is missing or invalid");
  }
  // nonceManager keeps nonces consistent for concurrent requests within one instance
  return privateKeyToAccount(privateKey as Hex, { nonceManager });
}

export function getRelayerAddress(): Address {
  return getRelayerAccount().address;
}

let cachedClients: RelayerClients | undefined;

export function getRelayerClients(): RelayerClients {
  if (cachedClients) return cachedClients;

  const account = getRelayerAccount();
  const transport = http(getAlchemyRpcUrl(defaultChain.id));

  cachedClients = {
    publicClient: createPublicClient({ chain: defaultChain, transport }) as PublicClient,
    walletClient: createWalletClient({ account, chain: defaultChain, transport }),
  };
  return cachedClients;
}

/**
 * Whether the address currently wears the leader hat (and is eligible and the hat is active).
 */
export async function isLeader(
  publicClient: PublicClient,
  config: LeaderHatConfig,
  address: string
): Promise<boolean> {
  return publicClient.readContract({
    address: config.hatsAddress,
    abi: hatsAbi,
    functionName: "isWearerOfHat",
    args: [getAddress(address), config.leaderHatId],
  });
}

/**
 * Mints the leader hat to the recipient and adds them as a signer on the leaders' Safe.
 * Each transaction is simulated first so reverts surface before any gas is spent, and is
 * sent with a buffered gas limit.
 */
export async function onboardLeader(
  { publicClient, walletClient }: RelayerClients,
  config: RelayerConfig,
  recipientAddress: string
): Promise<OnboardLeaderResult> {
  const recipient = getAddress(recipientAddress);
  const account = walletClient.account;

  if (await isLeader(publicClient, config, recipient)) {
    return { status: "already_onboarded" };
  }

  const mintCall = {
    account,
    address: config.hatsAddress,
    abi: hatsAbi,
    functionName: "mintHat",
    args: [config.leaderHatId, recipient],
  } as const;
  const { request: mintRequest } = await publicClient.simulateContract(mintCall);
  const mintGas = await publicClient.estimateContractGas(mintCall);
  const mintHatTxHash = await walletClient.writeContract({
    ...mintRequest,
    gas: withGasBuffer(mintGas),
  });
  const mintReceipt = await publicClient.waitForTransactionReceipt({ hash: mintHatTxHash });
  if (mintReceipt.status !== "success") {
    throw new RelayerTransactionError("mintHat transaction reverted", mintHatTxHash);
  }

  const claimCall = {
    account,
    address: config.hsgAddress,
    abi: hsgAbi,
    functionName: "claimSignerFor",
    args: [config.leaderHatId, recipient],
  } as const;
  const { request: claimRequest } = await publicClient.simulateContract(claimCall);
  const claimGas = await publicClient.estimateContractGas(claimCall);
  const claimSignerTxHash = await walletClient.writeContract({
    ...claimRequest,
    gas: withGasBuffer(claimGas),
  });
  const claimReceipt = await publicClient.waitForTransactionReceipt({ hash: claimSignerTxHash });
  if (claimReceipt.status !== "success") {
    throw new RelayerTransactionError("claimSignerFor transaction reverted", claimSignerTxHash);
  }

  return { status: "onboarded", mintHatTxHash, claimSignerTxHash };
}
