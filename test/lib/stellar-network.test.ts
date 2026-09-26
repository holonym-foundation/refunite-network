// @vitest-environment node
import {
  StellarConfigError,
  StellarRpcError,
  accountExists,
  getStellarNetworkConfig,
  getTransactionOutcome,
  getTreasuryBalance,
} from "@/lib/stellar/network";
import { Keypair } from "@stellar/stellar-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getLedgerEntries = vi.fn();
const getTransaction = vi.fn();

vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const sdk = await importOriginal<typeof import("@stellar/stellar-sdk")>();
  return {
    ...sdk,
    rpc: {
      ...sdk.rpc,
      Server: class {
        getLedgerEntries = getLedgerEntries;
        getTransaction = getTransaction;
      },
    },
  };
});

const treasury = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 3));
const config = {
  rpcUrl: "https://rpc.invalid",
  networkPassphrase: "Test SDF Network ; September 2015",
  source: treasury,
};
const account = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 4)).publicKey();
const found = (balance: bigint) => ({
  latestLedger: 100,
  entries: [{ val: { type: "account", account: { balance } } }],
});

beforeEach(() => {
  getLedgerEntries.mockReset();
  getTransaction.mockReset();
});

describe("accountExists", () => {
  it("is true when the network returns the account", async () => {
    getLedgerEntries.mockResolvedValue(found(BigInt(10)));
    await expect(accountExists(config, account)).resolves.toBe(true);
  });

  it("is false only when the network answers with no entry", async () => {
    getLedgerEntries.mockResolvedValue({ latestLedger: 100, entries: [] });
    await expect(accountExists(config, account)).resolves.toBe(false);
  });

  it("throws, rather than reporting a missing account, when the RPC is unreachable", async () => {
    getLedgerEntries.mockRejectedValue(new Error("Request failed with status code 503"));
    await expect(accountExists(config, account)).rejects.toBeInstanceOf(StellarRpcError);
  });

  it.each([undefined, {}, { latestLedger: 100 }, { entries: [] }])(
    "throws on an unusable answer %j",
    async (answer) => {
      getLedgerEntries.mockResolvedValue(answer);
      await expect(accountExists(config, account)).rejects.toBeInstanceOf(StellarRpcError);
    }
  );
});

describe("getTreasuryBalance", () => {
  it("returns the balance in stroops", async () => {
    getLedgerEntries.mockResolvedValue(found(BigInt(98_779_063_908)));
    await expect(getTreasuryBalance(config)).resolves.toBe(BigInt(98_779_063_908));
  });

  it("reports a missing treasury account as a configuration error", async () => {
    getLedgerEntries.mockResolvedValue({ latestLedger: 100, entries: [] });
    await expect(getTreasuryBalance(config)).rejects.toBeInstanceOf(StellarConfigError);
  });

  it("reports an outage as an RPC error", async () => {
    getLedgerEntries.mockRejectedValue(new Error("fetch failed"));
    await expect(getTreasuryBalance(config)).rejects.toBeInstanceOf(StellarRpcError);
  });
});

describe("getTransactionOutcome", () => {
  it.each([
    ["SUCCESS", "success"],
    ["FAILED", "failed"],
    ["NOT_FOUND", "not_found"],
  ])("maps %s to %s", async (status, outcome) => {
    getTransaction.mockResolvedValue({ status });
    await expect(getTransactionOutcome(config, "a".repeat(64))).resolves.toBe(outcome);
  });

  it("does not treat an unexpected answer as not found", async () => {
    getTransaction.mockResolvedValue({ status: undefined });
    await expect(getTransactionOutcome(config, "a".repeat(64))).rejects.toBeInstanceOf(
      StellarRpcError
    );
  });
});

describe("getStellarNetworkConfig", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("reads the server-only STELLAR_RPC_URL", () => {
    process.env.STELLAR_RPC_URL = "https://rpc.example";
    process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE = config.networkPassphrase;
    process.env.WALLET_SOURCE_PRIVATE_KEY = treasury.secret();
    expect(getStellarNetworkConfig().rpcUrl).toBe("https://rpc.example");
  });

  it("does not fall back to the old public variable", () => {
    delete process.env.STELLAR_RPC_URL;
    process.env.NEXT_PUBLIC_STELLAR_RPC_URL = "https://rpc.example";
    expect(() => getStellarNetworkConfig()).toThrow("STELLAR_RPC_URL is missing");
  });
});
