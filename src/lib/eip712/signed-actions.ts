import { Address, TypedDataDefinition, getAddress, isAddress } from "viem";
import { z } from "zod";
import { DOMAIN, domainSchema } from ".";

/**
 * EIP-712 actions signed with an Ethereum (WaaP) wallet: leaders, and anyone starting a
 * session. The client signs one with `createSignedActionTypedData`; the server rebuilds the
 * same typed data (with its own chain id) and checks it with `verifyLeaderAction` /
 * `verifySignedAction` in src/lib/signed-actions.
 *
 * Beneficiaries are Stellar accounts and sign with their Stellar key instead; see
 * src/lib/stellar/signed-actions.ts.
 */
export const SIGNED_ACTION_TYPES = {
  // --- Signed by any wallet: proves the address to start a read-only session ---
  StartSession: [
    { name: "account", type: "address" },
    { name: "nonce", type: "string" },
    { name: "issuedAt", type: "uint256" },
  ],
  // --- Signed by a leader ---
  AddBeneficiary: [
    { name: "leader", type: "address" },
    { name: "beneficiary", type: "string" }, // Stellar account (G…)
    { name: "nonce", type: "string" },
    { name: "issuedAt", type: "uint256" },
  ],
  CreateDisbursement: [
    { name: "leader", type: "address" },
    { name: "beneficiary", type: "string" }, // Stellar account (G…)
    { name: "amount", type: "string" },
    { name: "nonce", type: "string" },
    { name: "issuedAt", type: "uint256" },
  ],
  CancelDisbursement: [
    { name: "leader", type: "address" },
    { name: "disbursementId", type: "string" },
    { name: "nonce", type: "string" },
    { name: "issuedAt", type: "uint256" },
  ],
} as const;

export type SignedActionType = keyof typeof SIGNED_ACTION_TYPES;
export type SignerRole = "account" | "leader";

/** Who signs each action; the message field of the same name holds their address. */
export const SIGNER_ROLE = {
  StartSession: "account", // any wallet; roles are checked per request
  AddBeneficiary: "leader",
  CreateDisbursement: "leader",
  CancelDisbursement: "leader",
} as const satisfies Record<SignedActionType, SignerRole>;

export type LeaderActionType = {
  [K in SignedActionType]: (typeof SIGNER_ROLE)[K] extends "leader" ? K : never;
}[SignedActionType];

const address = z
  .string()
  .refine((value) => isAddress(value), "Invalid address")
  .transform((value) => getAddress(value));

/** A Stellar account address (G…); the server also checks its checksum. */
export const stellarAccount = z
  .string()
  .regex(/^G[A-Z2-7]{55}$/, "Invalid Stellar account address");

export const common = {
  nonce: z.string().min(8).max(128),
  // Unix seconds; accepts bigint, number or numeric string (JSON cannot carry bigint)
  issuedAt: z.union([z.bigint(), z.number().int(), z.string().regex(/^\d+$/)]).transform(BigInt),
};

// XLM has 7 decimal places
export const xlmAmount = z
  .string()
  .regex(/^\d+(\.\d{1,7})?$/, "Amount must be a positive XLM amount with at most 7 decimals")
  .refine((value) => Number(value) > 0, "Amount must be greater than zero");

export const signedActionSchemas = {
  StartSession: z.object({ ...common, account: address }).strict(),
  AddBeneficiary: z.object({ ...common, leader: address, beneficiary: stellarAccount }).strict(),
  CreateDisbursement: z
    .object({ ...common, leader: address, beneficiary: stellarAccount, amount: xlmAmount })
    .strict(),
  CancelDisbursement: z
    .object({ ...common, leader: address, disbursementId: z.string().uuid() })
    .strict(),
} satisfies Record<SignedActionType, z.ZodTypeAny>;

export type SignedActionMessage<T extends SignedActionType> = z.infer<
  (typeof signedActionSchemas)[T]
>;

/** The address of whoever signs `message` (its account or leader field). */
export function signerOf<T extends SignedActionType>(
  primaryType: T,
  message: SignedActionMessage<T>
): Address {
  return (message as Record<string, unknown>)[SIGNER_ROLE[primaryType]] as Address;
}

export function createSignedActionTypedData<T extends SignedActionType>(
  primaryType: T,
  message: SignedActionMessage<T>,
  chainId: number
): TypedDataDefinition {
  return {
    domain: domainSchema.parse({ ...DOMAIN, chainId }),
    primaryType,
    types: { [primaryType]: SIGNED_ACTION_TYPES[primaryType] },
    message,
  } as unknown as TypedDataDefinition;
}
