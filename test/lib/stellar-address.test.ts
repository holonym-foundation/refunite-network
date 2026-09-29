// @vitest-environment node
import {
  StellarConfigError,
  deriveStellarWalletAddress,
  getStellarWalletConfig,
} from "@/lib/stellar/address";
import { afterEach, describe, expect, it } from "vitest";

const config = {
  networkPassphrase: "Test SDF Network ; September 2015",
  factoryContractId: "CDJOTVVKNPEQP577P2GSYBPFVEY3JPJ7QJ3T2YWPMTI3TWIKNPTDO7Z2",
  walletSalt: "0102030405060708090a0b0c",
};
const ETH = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";

describe("deriveStellarWalletAddress", () => {
  it("matches the Human-Wallet-On-Stellar derivation", () => {
    // Computed with the Stellar app's own code (api/wallet/check) for the same inputs
    expect(deriveStellarWalletAddress(ETH, config)).toBe(
      "CC3ARJ4BI6Q2IW7J27YC3K7VHC7O25PZZ74OGFL7RKG5THHEMVJVN7CY"
    );
  });

  it("does not depend on address casing", () => {
    expect(deriveStellarWalletAddress(ETH.toLowerCase(), config)).toBe(
      deriveStellarWalletAddress(ETH, config)
    );
  });

  it("changes with the salt and the network", () => {
    const base = deriveStellarWalletAddress(ETH, config);
    expect(deriveStellarWalletAddress(ETH, { ...config, walletSalt: "ff".repeat(12) })).not.toBe(
      base
    );
    expect(
      deriveStellarWalletAddress(ETH, {
        ...config,
        networkPassphrase: "Public Global Stellar Network ; September 2015",
      })
    ).not.toBe(base);
  });
});

describe("getStellarWalletConfig", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("reads a valid config from env", () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE = config.networkPassphrase;
    process.env.NEXT_PUBLIC_STELLAR_ECDSA_SECP256K1_FACTORY_CONTRACT_ID = config.factoryContractId;
    process.env.WALLET_SALT = config.walletSalt;
    expect(getStellarWalletConfig()).toEqual(config);
  });

  it.each([
    ["WALLET_SALT", "abc"],
    ["NEXT_PUBLIC_STELLAR_ECDSA_SECP256K1_FACTORY_CONTRACT_ID", "not-a-contract"],
    ["NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE", ""],
  ])("rejects an invalid %s", (name, value) => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE = config.networkPassphrase;
    process.env.NEXT_PUBLIC_STELLAR_ECDSA_SECP256K1_FACTORY_CONTRACT_ID = config.factoryContractId;
    process.env.WALLET_SALT = config.walletSalt;
    process.env[name] = value;
    expect(() => getStellarWalletConfig()).toThrow(StellarConfigError);
  });
});
