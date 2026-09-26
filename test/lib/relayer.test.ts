import {
  RelayerClients,
  RelayerConfig,
  RelayerConfigError,
  RelayerTransactionError,
  getRelayerAddress,
  isLeader,
  onboardLeader,
  withGasBuffer,
} from "@/lib/relayer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const config: RelayerConfig = {
  hatsAddress: "0x3bc1A0Ad72417f2d411118085256fC53CBdDd137",
  hsgAddress: "0xB9Ec1bd7aD64E6f84BE7bF763c9774f4dd512517",
  leaderHatId: BigInt("0x0000042c00010001000100000000000000000000000000000000000000000000"),
};

const recipient = "0x1111111111111111111111111111111111111111";
const mintHash = `0x${"aa".repeat(32)}` as const;
const claimHash = `0x${"bb".repeat(32)}` as const;

const SAFE = "0x5555555555555555555555555555555555555555";

function makeClients({
  recipientIsLeader = false,
  isSafeOwner = false,
  mintStatus = "success",
} = {}) {
  const publicClient = {
    // isWearerOfHat on Hats, safe() on the HSG, isOwner on the Safe
    readContract: vi.fn(async ({ functionName }: { functionName: string }) =>
      functionName === "safe" ? SAFE : functionName === "isOwner" ? isSafeOwner : recipientIsLeader
    ),
    simulateContract: vi.fn(async (args) => ({ request: args })),
    estimateContractGas: vi.fn(async () => BigInt(100_000)),
    waitForTransactionReceipt: vi.fn(async ({ hash }) => ({
      status: hash === mintHash ? mintStatus : "success",
    })),
  };
  const walletClient = {
    account: { address: "0x2222222222222222222222222222222222222222" },
    writeContract: vi.fn(async ({ functionName }) =>
      functionName === "mintHat" ? mintHash : claimHash
    ),
  };
  return {
    publicClient,
    walletClient,
    clients: { publicClient, walletClient } as unknown as RelayerClients,
  };
}

describe("isLeader", () => {
  it("checks the leader hat on the Hats contract", async () => {
    const { publicClient, clients } = makeClients({ recipientIsLeader: true });

    await expect(isLeader(clients.publicClient, config, recipient)).resolves.toBe(true);
    expect(publicClient.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: config.hatsAddress,
        functionName: "isWearerOfHat",
        args: [recipient, config.leaderHatId],
      })
    );
  });
});

describe("onboardLeader", () => {
  it("mints the leader hat, then claims the Safe signer", async () => {
    const { walletClient, clients } = makeClients();

    const result = await onboardLeader(clients, config, recipient);

    expect(result).toEqual({
      status: "onboarded",
      mintHatTxHash: mintHash,
      claimSignerTxHash: claimHash,
    });
    expect(
      walletClient.writeContract.mock.calls.map(([req]) => [req.address, req.functionName])
    ).toEqual([
      [config.hatsAddress, "mintHat"],
      [config.hsgAddress, "claimSignerFor"],
    ]);
    expect(walletClient.writeContract.mock.calls[0][0].args).toEqual([
      config.leaderHatId,
      recipient,
    ]);
  });

  it("sends each transaction with a 25% gas buffer over the estimate", async () => {
    const { walletClient, clients } = makeClients();

    await onboardLeader(clients, config, recipient);

    expect(walletClient.writeContract.mock.calls.map(([req]) => req.gas)).toEqual([
      BigInt(125_000),
      BigInt(125_000),
    ]);
  });

  it("sends no transactions when the recipient already wears the hat and is a Safe owner", async () => {
    const { walletClient, clients } = makeClients({ recipientIsLeader: true, isSafeOwner: true });

    await expect(onboardLeader(clients, config, recipient)).resolves.toEqual({
      status: "already_onboarded",
    });
    expect(walletClient.writeContract).not.toHaveBeenCalled();
  });

  it("only adds the signer when an earlier attempt already minted the hat", async () => {
    const { publicClient, walletClient, clients } = makeClients({ recipientIsLeader: true });

    const result = await onboardLeader(clients, config, recipient);

    expect(result).toEqual({
      status: "onboarded",
      mintHatTxHash: null,
      claimSignerTxHash: claimHash,
    });
    expect(walletClient.writeContract.mock.calls.map(([req]) => req.functionName)).toEqual([
      "claimSignerFor",
    ]);
    expect(publicClient.readContract).toHaveBeenCalledWith(
      expect.objectContaining({ address: SAFE, functionName: "isOwner", args: [recipient] })
    );
  });

  it("stops before claiming when the mint reverts", async () => {
    const { walletClient, clients } = makeClients({ mintStatus: "reverted" });

    await expect(onboardLeader(clients, config, recipient)).rejects.toBeInstanceOf(
      RelayerTransactionError
    );
    expect(walletClient.writeContract).toHaveBeenCalledTimes(1);
  });

  it("does not send a transaction when simulation fails", async () => {
    const { publicClient, walletClient, clients } = makeClients();
    publicClient.simulateContract.mockRejectedValueOnce(new Error("NotAdmin"));

    await expect(onboardLeader(clients, config, recipient)).rejects.toThrow("NotAdmin");
    expect(walletClient.writeContract).not.toHaveBeenCalled();
  });
});

describe("withGasBuffer", () => {
  it("adds 25% and rounds down", () => {
    expect(withGasBuffer(BigInt(84_550))).toBe(BigInt(105_687));
  });
});

describe("getRelayerAddress", () => {
  const original = process.env.RELAYER_PRIVATE_KEY;
  beforeEach(() => {
    delete process.env.RELAYER_PRIVATE_KEY;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.RELAYER_PRIVATE_KEY;
    else process.env.RELAYER_PRIVATE_KEY = original;
  });

  it("throws a config error when the key is missing or malformed", () => {
    expect(() => getRelayerAddress()).toThrow(RelayerConfigError);
    process.env.RELAYER_PRIVATE_KEY = "0x1234";
    expect(() => getRelayerAddress()).toThrow(RelayerConfigError);
  });

  it("derives the address from the key", () => {
    // Well-known Anvil/Hardhat test key #0
    process.env.RELAYER_PRIVATE_KEY =
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    expect(getRelayerAddress()).toBe("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
  });
});
