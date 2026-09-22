import { Address, TypedDataDefinition, getAddress, isAddress } from "viem";
import { z } from "zod";
import { DOMAIN, domainSchema } from ".";

/**
 * EIP-712 actions that only a current leader may perform. The client signs one of these
 * with `createLeaderActionTypedData`; the server rebuilds the same typed data (with its own
 * chain id) and checks it with `verifyLeaderAction` in src/lib/leader-auth.
 */
export const LEADER_ACTION_TYPES = {
  AddBeneficiary: [
    { name: "leader", type: "address" },
    { name: "beneficiary", type: "address" },
    { name: "nonce", type: "string" },
    { name: "issuedAt", type: "uint256" },
  ],
  // Read-only: the signature may be reused until it expires (see READ_ONLY_LEADER_ACTIONS)
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
} as const;

export type LeaderActionType = keyof typeof LEADER_ACTION_TYPES;

/** Actions that change nothing; their nonce is not consumed, so a signature can be reused. */
export const READ_ONLY_LEADER_ACTIONS: ReadonlySet<LeaderActionType> = new Set<LeaderActionType>([
  "ListBeneficiaries",
]);

const address = z
  .string()
  .refine((value) => isAddress(value), "Invalid address")
  .transform((value) => getAddress(value));

const common = {
  leader: address,
  nonce: z.string().min(8).max(128),
  // Unix seconds; accepts bigint, number or numeric string (JSON cannot carry bigint)
  issuedAt: z.union([z.bigint(), z.number().int(), z.string().regex(/^\d+$/)]).transform(BigInt),
};

// XLM has 7 decimal places
const xlmAmount = z
  .string()
  .regex(/^\d+(\.\d{1,7})?$/, "Amount must be a positive XLM amount with at most 7 decimals")
  .refine((value) => Number(value) > 0, "Amount must be greater than zero");

export const leaderActionSchemas = {
  AddBeneficiary: z.object({ ...common, beneficiary: address }).strict(),
  ListBeneficiaries: z.object(common).strict(),
  CreateDisbursement: z.object({ ...common, beneficiary: address, amount: xlmAmount }).strict(),
} satisfies Record<LeaderActionType, z.ZodTypeAny>;

export type LeaderActionMessage<T extends LeaderActionType> = z.infer<
  (typeof leaderActionSchemas)[T]
> & { leader: Address };

export function createLeaderActionTypedData<T extends LeaderActionType>(
  primaryType: T,
  message: LeaderActionMessage<T>,
  chainId: number
): TypedDataDefinition {
  return {
    domain: domainSchema.parse({ ...DOMAIN, chainId }),
    primaryType,
    types: { [primaryType]: LEADER_ACTION_TYPES[primaryType] },
    message,
  } as unknown as TypedDataDefinition;
}
