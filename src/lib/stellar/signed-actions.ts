import { z } from "zod";
import { common, stellarAccount } from "@/lib/eip712/signed-actions";

/**
 * Actions signed by a beneficiary with their Stellar key (SEP-53 message signing, as
 * Freighter's signMessage does). Shared by the client, which signs the text from
 * `buildStellarActionMessage`, and the server, which rebuilds the same text from the fields
 * and checks the signature (verifyStellarAction in src/lib/signed-actions).
 *
 * Client-safe: no server-only imports.
 */
export const STELLAR_ACTIONS = {
  StartStellarSession: {
    signer: "account",
    statement: () => "Sign in to RelayID to see your disbursements.",
  },
  RedeemDisbursement: {
    signer: "beneficiary",
    statement: () => "Redeem a disbursement into this Stellar account.",
  },
} as const;

export type StellarActionType = keyof typeof STELLAR_ACTIONS;

export const stellarActionSchemas = {
  StartStellarSession: z.object({ ...common, account: stellarAccount }).strict(),
  RedeemDisbursement: z
    .object({ ...common, beneficiary: stellarAccount, disbursementId: z.string().uuid() })
    .strict(),
} satisfies Record<StellarActionType, z.ZodTypeAny>;

export type StellarActionMessage<T extends StellarActionType> = z.infer<
  (typeof stellarActionSchemas)[T]
>;

/** The Stellar account that signs `message`. */
export function stellarSignerOf<T extends StellarActionType>(
  primaryType: T,
  message: StellarActionMessage<T>
): string {
  return (message as Record<string, unknown>)[STELLAR_ACTIONS[primaryType].signer] as string;
}

/**
 * The exact text that is signed. Every field is on its own labelled line, and the network
 * passphrase binds it to one Stellar network, so a signature means one thing only.
 */
export function buildStellarActionMessage<T extends StellarActionType>(
  primaryType: T,
  message: StellarActionMessage<T>,
  networkPassphrase: string
): string {
  const fields = message as Record<string, unknown>;
  const lines = [
    "RelayID",
    STELLAR_ACTIONS[primaryType].statement(),
    `Action: ${primaryType}`,
    `Account: ${stellarSignerOf(primaryType, message)}`,
  ];
  if (typeof fields.disbursementId === "string")
    lines.push(`Disbursement: ${fields.disbursementId}`);
  lines.push(
    `Network: ${networkPassphrase}`,
    `Nonce: ${message.nonce}`,
    `Issued at: ${message.issuedAt}`
  );
  return lines.join("\n");
}
