"use server";

import { INVITE_TTL_SECONDS } from "@/lib/constants";
import { verifyNetworkInviteSignature } from "@/lib/eip712";
import client from "@/client/turso";
import { marshalTypedData, unmarshalTypedData } from "@/lib/utils/serialize";
import { randomBytes } from "crypto";
import { getAddress, Hash } from "viem";
import assert from "assert";

export type VerifyInviteResult = {
  success: boolean;
  error?: string;
  inviterAddress?: string;
  signature?: string;
  typedData?: any;
};

export type CreateInviteResult = {
  success: boolean;
  inviteCode?: string;
  error?: string;
};

function generateInviteCode(): string {
  const bytes = randomBytes(6);
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
    .substring(0, 8);
}

/**
 * Creates a new invite using a signed EIP-712 typed data
 */
export async function createInvite(
  inviterAddress: string,
  signature: string,
  nonce: string,
  typedData: any
): Promise<CreateInviteResult> {
  try {
    if (!inviterAddress || !signature || !nonce || !typedData) {
      return {
        success: false,
        error: "inviterAddress, signature, nonce, and typedData are required",
      };
    }

    // Verify the EIP-712 signature
    const isValidSignature = await verifyNetworkInviteSignature({
      typedData,
      signature: signature as Hash,
      address: getAddress(inviterAddress),
    });

    if (!isValidSignature) {
      return { success: false, error: "Invalid signature" };
    }

    // Verify the typedData contents match the request
    if (typedData.message.inviterAddress !== inviterAddress || typedData.message.nonce !== nonce) {
      return { success: false, error: "TypedData mismatch with request data" };
    }

    // Extract data from the verified typed data
    const { createdAt } = typedData.message;

    // Check if signature creation time is not too old (24 hours)
    const signatureTimestamp = Number(createdAt);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (currentTimestamp - signatureTimestamp > 86400) {
      return { success: false, error: "Signature has expired" };
    }

    // Generate unique invite code
    const inviteCode = generateInviteCode();

    // Marshal BigInt values in typedData before storing
    const marshaledTypedData = marshalTypedData(typedData);

    // Store invite in database
    const result = await client.execute(
      "INSERT INTO invites (invite_code, inviter_signature, typed_data) VALUES (?, ?, ?)",
      [inviteCode, signature, JSON.stringify(marshaledTypedData)]
    );

    assert(result.rowsAffected === 1, "Failed to store invite");

    return {
      success: true,
      inviteCode,
    };
  } catch (error) {
    console.error("Error creating invite:", error);
    return { success: false, error: "Failed to create invite" };
  }
}

/**
 * Gets the full invite data including the typed_data with BigInt values properly deserialized
 */
export async function getInviteByCode(inviteCode: string) {
  try {
    const result = await client.execute("SELECT * FROM invites WHERE invite_code = ?", [
      inviteCode,
    ]);

    if (result.rows.length === 0) {
      return { success: false, error: "Invalid invite code" };
    }

    // Unmarshal any BigInt values in typed_data
    const data = result.rows[0];
    if (data.typed_data) {
      data.typed_data = unmarshalTypedData(data.typed_data);
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error in getInviteByCode:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function verifyInvite(inviteCode: string): Promise<VerifyInviteResult> {
  try {
    const result = await client.execute("SELECT * FROM invites WHERE invite_code = ?", [
      inviteCode,
    ]);

    if (result.rows.length === 0) {
      return { success: false, error: "Invalid invite code" };
    }

    const data = result.rows[0];
    const typedData = unmarshalTypedData(JSON.parse(data.typed_data as string));

    // Check if invite has expired
    const signatureTimestamp = Number(typedData.message.createdAt);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (currentTimestamp - signatureTimestamp > INVITE_TTL_SECONDS) {
      return { success: false, error: "Invite has expired" };
    }

    // Check if invite has been used
    if (data.used_at) {
      return { success: false, error: "Invite has already been used" };
    }

    return {
      success: true,
      inviterAddress: typedData.message.inviterAddress,
      signature: data.inviter_signature as string,
      typedData,
    };
  } catch (error) {
    console.error("Error in verifyInvite:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
