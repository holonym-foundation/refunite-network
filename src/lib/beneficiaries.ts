import { DB } from "@/lib/database/service";
import { Beneficiary } from "@/lib/database/types";
import { SignedActionError } from "@/lib/signed-actions";
import { StrKey } from "@stellar/stellar-sdk";
import { Address } from "viem";

/** Shape returned by the beneficiaries API. */
export type BeneficiaryResponse = {
  id: string;
  stellarAddress: string; // Stellar account (G…)
  createdAt: string;
};

export function toBeneficiaryResponse(row: Beneficiary): BeneficiaryResponse {
  return { id: row.id, stellarAddress: row.stellar_address, createdAt: row.created_at };
}

export class BeneficiaryConflictError extends Error {
  constructor() {
    super("This Stellar account is already registered as a beneficiary");
    this.name = "BeneficiaryConflictError";
  }
}

/**
 * Registers the Stellar account `beneficiary` under `leader` (already verified as a current
 * leader). An account can belong to only one leader.
 */
export async function addBeneficiary(leader: Address, beneficiary: string): Promise<Beneficiary> {
  if (!StrKey.isValidEd25519PublicKey(beneficiary)) {
    throw new SignedActionError("invalid_request", "Not a valid Stellar account address");
  }

  const created = await DB.createBeneficiary({ stellar_address: beneficiary, added_by: leader });
  if (!created) throw new BeneficiaryConflictError();

  await DB.logAudit({
    entity_type: "beneficiary",
    entity_id: 0, // audit_log ids are integers; the uuid is in metadata
    action: "create",
    actor_address: leader,
    metadata: { beneficiary_id: created.id, beneficiary },
  });
  return created;
}
