import { Address, StrKey, hash, xdr } from "@stellar/stellar-sdk";
import { getAddress } from "viem";

/**
 * Stellar smart-wallet address for an Ethereum address, ported from Human-Wallet-On-Stellar
 * (api/wallet/check). The ECDSA secp256k1 factory deploys one wallet per Ethereum address at
 * a deterministic contract id, so the address is known before the wallet is deployed.
 *
 * salt = ethAddress (20 bytes) ++ WALLET_SALT (12 bytes); the contract id is derived from the
 * network passphrase, the factory contract and that salt.
 */
export type StellarWalletConfig = {
  networkPassphrase: string;
  factoryContractId: string;
  walletSalt: string; // 12-byte hex, must match the Stellar app to get the same addresses
};

export class StellarConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StellarConfigError";
  }
}

export function getStellarWalletConfig(): StellarWalletConfig {
  const networkPassphrase = process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE;
  const factoryContractId = process.env.NEXT_PUBLIC_STELLAR_ECDSA_SECP256K1_FACTORY_CONTRACT_ID;
  const walletSalt = process.env.WALLET_SALT;

  if (!networkPassphrase)
    throw new StellarConfigError("NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE is missing");
  if (!factoryContractId || !StrKey.isValidContract(factoryContractId)) {
    throw new StellarConfigError(
      "NEXT_PUBLIC_STELLAR_ECDSA_SECP256K1_FACTORY_CONTRACT_ID is missing or invalid"
    );
  }
  if (!walletSalt || !/^[0-9a-fA-F]{24}$/.test(walletSalt)) {
    throw new StellarConfigError("WALLET_SALT must be a 12-byte hex string");
  }
  return { networkPassphrase, factoryContractId, walletSalt };
}

/** The 32-byte deploy salt for an Ethereum address: address (20 bytes) ++ WALLET_SALT (12). */
export function walletDeploySalt(ethAddress: string, config: StellarWalletConfig): Buffer {
  const ethBytes = Buffer.from(getAddress(ethAddress).slice(2), "hex");
  return Buffer.concat([ethBytes, Buffer.from(config.walletSalt, "hex")]);
}

export function deriveStellarWalletAddress(
  ethAddress: string,
  config: StellarWalletConfig
): string {
  const salt = walletDeploySalt(ethAddress, config);

  const preimage = xdr.HashIdPreimage.envelopeTypeContractId(
    new xdr.HashIdPreimageContractId({
      networkId: hash(Buffer.from(config.networkPassphrase, "utf-8")),
      contractIdPreimage: xdr.ContractIdPreimage.contractIdPreimageFromAddress(
        new xdr.ContractIdPreimageFromAddress({
          address: Address.fromString(config.factoryContractId).toScAddress(),
          salt,
        })
      ),
    })
  );

  return StrKey.encodeContract(hash(preimage.toXDR()));
}
