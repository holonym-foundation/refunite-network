"use server";

import { INVITE_TTL_SECONDS } from "@/lib/constants";
import { verifyNetworkInviteSignature } from "@/lib/eip712";
import { supabase, supabaseAdmin } from "@/lib/supabase/client";
import { deserializeBigInts, serializeBigInts } from "@/lib/utils/serialize";
import { randomBytes } from "crypto";
import { getAddress, Hash } from "viem";

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

    // Serialize BigInt values in typedData before storing
    const serializedTypedData = serializeBigInts(typedData);

    // Store invite in database
    const { error, data } = await supabaseAdmin
      .from("invites")
      .insert({
        invite_code: inviteCode,
        inviter_signature: signature,
        typed_data: serializedTypedData,
      })
      .select("invite_code")
      .single();

    if (error) {
      console.error("Error storing invite:", error);
      return { success: false, error: "Failed to store invite" };
    }

    return {
      success: true,
      inviteCode: data.invite_code,
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
    const { data, error } = await supabase
      .from("invites")
      .select("*")
      .eq("invite_code", inviteCode)
      .single();

    if (error || !data) {
      return { success: false, error: "Invalid invite code" };
    }

    // Deserialize any BigInt values in typed_data
    if (data.typed_data) {
      data.typed_data = deserializeBigInts(data.typed_data);
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error in getInviteByCode:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function verifyInvite(inviteCode: string): Promise<VerifyInviteResult> {
  try {
    const { data, error } = await supabaseAdmin
      .from("invites")
      .select("*")
      .eq("invite_code", inviteCode)
      .single();

    console.log("Verify invite data:", data, error);
    if (error || !data) {
      return { success: false, error: "Invalid invite code" };
    }

    const typedData = deserializeBigInts(data.typed_data);

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
      signature: data.inviter_signature,
      typedData,
    };
  } catch (error) {
    console.error("Error in verifyInvite:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
