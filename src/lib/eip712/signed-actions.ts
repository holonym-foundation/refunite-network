import { Address, TypedDataDefinition, getAddress, isAddress } from "viem";
import { z } from "zod";
import { DOMAIN, domainSchema } from ".";

/**
 * EIP-712 actions signed by a leader or a beneficiary. The client signs one with
 * `createSignedActionTypedData`; the server rebuilds the same typed data (with its own chain
 * id) and checks it with `verifyLeaderAction` / `verifyBeneficiaryAction` in
 * src/lib/signed-actions.
 */
export const SIGNED_ACTION_TYPES = {
  // --- Signed by a leader ---
  AddBeneficiary: [
    { name: "leader", type: "address" },
    { name: "beneficiary", type: "address" },
    { name: "nonce", type: "string" },
    { name: "issuedAt", type: "uint256" },
  ],
  ListBeneficiaries: [
    { name: "leader", type: "address" },
    { name: "nonce", type: "string" },
    { name: "issuedAt", type: "uint256" },
  ],
  CreateDisbursement: [
    { name: "leader", type: "address" },
    { name: "beneficiary", type: "address" },
    { name: "amount", type: "string" },
    { name: "nonce", type: "string" },
    { name: "issuedAt", type: "uint256" },
  ],
  // --- Signed by a beneficiary ---
  ListMyDisbursements: [
    { name: "beneficiary", type: "address" },
    { name: "nonce", type: "string" },
    { name: "issuedAt", type: "uint256" },
  ],
  RedeemDisbursement: [
    { name: "beneficiary", type: "address" },
    { name: "disbursementId", type: "string" },
    { name: "nonce", type: "string" },
    { name: "issuedAt", type: "uint256" },
  ],
} as const;

export type SignedActionType = keyof typeof SIGNED_ACTION_TYPES;
export type SignerRole = "leader" | "beneficiary";

/** Who signs each action; the message field of the same name holds their address. */
export const SIGNER_ROLE = {
  AddBeneficiary: "leader",
  ListBeneficiaries: "leader",
  CreateDisbursement: "leader",
  ListMyDisbursements: "beneficiary",
  RedeemDisbursement: "beneficiary",
} as const satisfies Record<SignedActionType, SignerRole>;

export type LeaderActionType = {
  [K in SignedActionType]: (typeof SIGNER_ROLE)[K] extends "leader" ? K : never;
}[SignedActionType];
export type BeneficiaryActionType = Exclude<SignedActionType, LeaderActionType>;

/** Actions that change nothing; their nonce is not consumed, so a signature can be reused. */
export const READ_ONLY_ACTIONS: ReadonlySet<SignedActionType> = new Set<SignedActionType>([
  "ListBeneficiaries",
  "ListMyDisbursements",
]);

const address = z
  .string()
  .refine((value) => isAddress(value), "Invalid address")
  .transform((value) => getAddress(value));

const common = {
  nonce: z.string().min(8).max(128),
  // Unix seconds; accepts bigint, number or numeric string (JSON cannot carry bigint)
  issuedAt: z.union([z.bigint(), z.number().int(), z.string().regex(/^\d+$/)]).transform(BigInt),
};

// XLM has 7 decimal places
const xlmAmount = z
  .string()
  .regex(/^\d+(\.\d{1,7})?$/, "Amount must be a positive XLM amount with at most 7 decimals")
  .refine((value) => Number(value) > 0, "Amount must be greater than zero");

export const signedActionSchemas = {
  AddBeneficiary: z.object({ ...common, leader: address, beneficiary: address }).strict(),
  ListBeneficiaries: z.object({ ...common, leader: address }).strict(),
  CreateDisbursement: z
    .object({ ...common, leader: address, beneficiary: address, amount: xlmAmount })
    .strict(),
  ListMyDisbursements: z.object({ ...common, beneficiary: address }).strict(),
  RedeemDisbursement: z
    .object({ ...common, beneficiary: address, disbursementId: z.string().uuid() })
    .strict(),
} satisfies Record<SignedActionType, z.ZodTypeAny>;

export type SignedActionMessage<T extends SignedActionType> = z.infer<
  (typeof signedActionSchemas)[T]
>;

/** The address of whoever signs `message` (its leader or beneficiary field). */
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
