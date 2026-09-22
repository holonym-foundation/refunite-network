import { DB } from "@/lib/database/service";
import { Beneficiary } from "@/lib/database/types";
import { SignedActionError } from "@/lib/signed-actions";
import { deriveStellarWalletAddress, getStellarWalletConfig } from "@/lib/stellar/address";
import { Address } from "viem";

/** Shape returned by the beneficiaries API. */
export type BeneficiaryResponse = {
  id: string;
  ethAddress: string;
  stellarAddress: string;
  createdAt: string;
};

export function toBeneficiaryResponse(row: Beneficiary): BeneficiaryResponse {
  return {
    id: row.id,
    ethAddress: row.eth_address,
    stellarAddress: row.stellar_address,
    createdAt: row.created_at,
  };
}

export class BeneficiaryConflictError extends Error {
  constructor() {
    super("This address is already registered as a beneficiary");
    this.name = "BeneficiaryConflictError";
  }
}

/**
 * Registers `beneficiary` under `leader` (already verified as a current leader), with its
 * deterministic Stellar wallet address. An address can belong to only one leader.
 */
export async function addBeneficiary(leader: Address, beneficiary: Address): Promise<Beneficiary> {
  if (beneficiary === leader) {
    throw new SignedActionError("invalid_request", "You cannot add yourself as a beneficiary");
  }

  const stellarAddress = deriveStellarWalletAddress(beneficiary, getStellarWalletConfig());
  const created = await DB.createBeneficiary({
    eth_address: beneficiary,
    stellar_address: stellarAddress,
    added_by: leader,
  });
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
