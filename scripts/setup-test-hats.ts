/**
 * Creates a self-contained Hats tree + Safe + Hats Signer Gate (v2) for testing onboarding.
 *
 *   top hat (you; also owner of the HSG)
 *   └─ relayer admin hat (worn by the relayer, so it can mint leaders)
 *      └─ leader hat (signer hat of the HSG; you are its eligibility module)
 *
 * Usage (Node 22.18+ runs TypeScript directly):
 *   DEPLOYER_PRIVATE_KEY=0x... RELAYER_ADDRESS=0x... FIRST_LEADER=0x... \
 *   RPC_URL=https://... node scripts/setup-test-hats.ts
 *
 * DEPLOYER_PRIVATE_KEY  wallet that receives the top hat and pays gas (never commit it)
 * RELAYER_ADDRESS       address of RELAYER_PRIVATE_KEY; receives the relayer admin hat
 * FIRST_LEADER          optional; minted the leader hat and made a Safe signer, so it can invite
 * RPC_URL               defaults to a public Sepolia RPC
 * TOP_HAT_ID            optional; reuse a top hat the deployer already wears (e.g. after a timeout)
 */
import {
  type Address,
  type Hex,
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  http,
  keccak256,
  parseAbi,
  parseEventLogs,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo, sepolia } from "viem/chains";

// Same addresses on Sepolia and Celo
const HATS = "0x3bc1A0Ad72417f2d411118085256fC53CBdDd137";
const HSG_IMPLEMENTATION = "0x148057884AC910Bdd93693F230C5c35a8c47CA3b"; // HSG v2.0.0
const MODULE_PROXY_FACTORY = "0x000000000000aDdB49795b0f9bA5BC298cDda236"; // Zodiac
const NO_MODULE = "0x0000000000000000000000000000000000004A75"; // Hats sentinel: no eligibility/toggle module

const hatsAbi = parseAbi([
  "function mintTopHat(address _target, string _details, string _imageURI) returns (uint256 topHatId)",
  "function createHat(uint256 _admin, string _details, uint32 _maxSupply, address _eligibility, address _toggle, bool _mutable, string _imageURI) returns (uint256 newHatId)",
  "function mintHat(uint256 _hatId, address _wearer) returns (bool success)",
  "function isWearerOfHat(address _user, uint256 _hatId) view returns (bool)",
]);
const hsgAbi = parseAbi([
  "function setUp(bytes initializeParams)",
  "function safe() view returns (address)",
  "function claimSignerFor(uint256 _hatId, address _signer)",
]);
const factoryAbi = parseAbi([
  "function deployModule(address masterCopy, bytes initializer, uint256 saltNonce) returns (address proxy)",
  "event ModuleProxyCreation(address indexed proxy, address indexed masterCopy)",
]);

function requireAddress(name: string): Address {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return getAddress(value);
}

const privateKey = process.env.DEPLOYER_PRIVATE_KEY as Hex | undefined;
if (!privateKey) throw new Error("DEPLOYER_PRIVATE_KEY is required");
const relayer = requireAddress("RELAYER_ADDRESS");
const firstLeader = process.env.FIRST_LEADER ? requireAddress("FIRST_LEADER") : undefined;
const existingTopHat = process.env.TOP_HAT_ID;
const rpcUrl = process.env.RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";

const account = privateKeyToAccount(privateKey);
const transport = http(rpcUrl, { timeout: 60_000 });
const chainId = await createPublicClient({ transport }).getChainId();
const chain = [sepolia, celo].find((c) => c.id === chainId);
if (!chain) throw new Error(`Unsupported chain ${chainId}; use Sepolia or Celo`);

const publicClient = createPublicClient({ chain, transport });
const walletClient = createWalletClient({ account, chain, transport });

const hex = (id: bigint) => `0x${id.toString(16).padStart(64, "0")}`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Simulates a write to get its return value, signs it once, and broadcasts it until mined.
 * Public RPCs often time out or rate-limit sends even when the transaction lands, so the
 * same signed transaction (same hash and nonce) is rebroadcast instead of failing.
 */
async function send<T>(label: string, params: Parameters<typeof publicClient.simulateContract>[0]) {
  const { request, result } = await publicClient.simulateContract({ ...params, account });
  const prepared = await walletClient.prepareTransactionRequest({
    account,
    chain,
    to: request.address,
    data: encodeFunctionData(request as never),
  } as never);
  const serializedTransaction = await walletClient.signTransaction(prepared as never);
  const hash = keccak256(serializedTransaction);

  for (let attempt = 1; ; attempt++) {
    try {
      await publicClient.sendRawTransaction({ serializedTransaction });
    } catch (error) {
      // "already known" / "nonce too low" just mean an earlier broadcast got through
      console.warn(`  ${label}: broadcast attempt ${attempt} failed (${(error as Error).name})`);
    }
    try {
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 90_000 });
      if (receipt.status !== "success") throw new Error(`${label} reverted: ${hash}`);
      console.log(`✓ ${label} (${hash})`);
      return { result: result as T, receipt };
    } catch (error) {
      if ((error as Error).message.includes("reverted") || attempt >= 5) throw error;
      await sleep(5_000);
    }
  }
}

console.log(`Chain ${chain.name}, deployer ${account.address}, relayer ${relayer}\n`);

let topHat: bigint;
if (existingTopHat) {
  // Resume after a failed run instead of minting another top hat
  topHat = BigInt(existingTopHat);
  const wears = await publicClient.readContract({
    address: HATS,
    abi: hatsAbi,
    functionName: "isWearerOfHat",
    args: [account.address, topHat],
  });
  if (!wears) throw new Error(`Deployer does not wear top hat ${hex(topHat)}`);
  console.log(`✓ reusing top hat ${hex(topHat)}`);
} else {
  ({ result: topHat } = await send<bigint>("mint top hat", {
    address: HATS,
    abi: hatsAbi,
    functionName: "mintTopHat",
    args: [account.address, "RelayID test network", ""],
  }));
}

const { result: relayerAdminHat } = await send<bigint>("create relayer admin hat", {
  address: HATS,
  abi: hatsAbi,
  functionName: "createHat",
  args: [topHat, "Relayer admin", 1, NO_MODULE, NO_MODULE, true, ""],
});

const { result: leaderHat } = await send<bigint>("create leader hat", {
  address: HATS,
  abi: hatsAbi,
  functionName: "createHat",
  args: [relayerAdminHat, "Leader", 150_000, account.address, NO_MODULE, true, ""],
});

await send("mint relayer admin hat to relayer", {
  address: HATS,
  abi: hatsAbi,
  functionName: "mintHat",
  args: [relayerAdminHat, relayer],
});

// HSG v2 deploys and attaches a new Safe when `safe` is the zero address
const setupParams = encodeAbiParameters(
  [
    {
      type: "tuple",
      components: [
        { name: "ownerHat", type: "uint256" },
        { name: "signerHats", type: "uint256[]" },
        { name: "safe", type: "address" },
        {
          name: "thresholdConfig",
          type: "tuple",
          components: [
            { name: "thresholdType", type: "uint8" },
            { name: "min", type: "uint120" },
            { name: "target", type: "uint120" },
          ],
        },
        { name: "locked", type: "bool" },
        { name: "claimableFor", type: "bool" },
        { name: "implementation", type: "address" },
        { name: "hsgGuard", type: "address" },
        { name: "hsgModules", type: "address[]" },
      ],
    },
  ],
  [
    {
      ownerHat: topHat,
      signerHats: [leaderHat],
      safe: "0x0000000000000000000000000000000000000000",
      thresholdConfig: { thresholdType: 0, min: 1n, target: 1n }, // same as production
      locked: false,
      claimableFor: true, // lets the relayer call claimSignerFor
      implementation: HSG_IMPLEMENTATION,
      hsgGuard: "0x0000000000000000000000000000000000000000",
      hsgModules: [],
    },
  ]
);
const { receipt: deployReceipt } = await send("deploy Hats Signer Gate + Safe", {
  address: MODULE_PROXY_FACTORY,
  abi: factoryAbi,
  functionName: "deployModule",
  args: [
    HSG_IMPLEMENTATION,
    encodeFunctionData({ abi: hsgAbi, functionName: "setUp", args: [setupParams] }),
    BigInt(Date.now()),
  ],
});
const [created] = parseEventLogs({
  abi: factoryAbi,
  eventName: "ModuleProxyCreation",
  logs: deployReceipt.logs,
});
const hsg = created.args.proxy;
const safe = await publicClient.readContract({ address: hsg, abi: hsgAbi, functionName: "safe" });

if (firstLeader) {
  await send("mint leader hat to first leader", {
    address: HATS,
    abi: hatsAbi,
    functionName: "mintHat",
    args: [leaderHat, firstLeader],
  });
  await send("add first leader as Safe signer", {
    address: hsg,
    abi: hsgAbi,
    functionName: "claimSignerFor",
    args: [leaderHat, firstLeader],
  });
}

console.log(`
Done. Put these in .env:

NEXT_PUBLIC_DEFAULT_CHAIN=${chain.id === sepolia.id ? "sepolia" : "celo"}
NEXT_PUBLIC_CHAIN_ID=${chain.id}
NEXT_PUBLIC_HATS_TREE_ID=${Number(topHat >> 224n)}
NEXT_PUBLIC_HATS_LEADER_ID=${hex(leaderHat)}
NEXT_PUBLIC_HATS_LEADER_SAFE_ACCOUNT=${safe}
NEXT_PUBLIC_HSG_CONTRACT_ADDRESS=${hsg}

Hats app: https://app.hatsprotocol.xyz/trees/${chain.id}/${Number(topHat >> 224n)}
`);
