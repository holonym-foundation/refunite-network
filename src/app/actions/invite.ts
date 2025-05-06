"use server";

import { supabase } from "@/lib/supabase/client";

export type VerifyInviteResult = {
  success: boolean;
  error?: string;
  inviterAddress?: string;
  signature?: string;
  nonce?: string;
  message?: string;
};

export async function verifyInvite(inviteCode: string): Promise<VerifyInviteResult> {
  try {
    const { data, error } = await supabase
      .from("invites")
      .select("inviter_address, inviter_signature, signature_nonce, expires_at, used_at, message")
      .eq("invite_code", inviteCode)
      .single();

    console.log("Verify invite data:", data, error);
    if (error || !data) {
      return { success: false, error: "Invalid invite code" };
    }

    // Check if invite has expired
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      return { success: false, error: "Invite has expired" };
    }

    // Check if invite has been used
    if (data.used_at) {
      return { success: false, error: "Invite has already been used" };
    }

    return {
      success: true,
      inviterAddress: data.inviter_address,
      signature: data.inviter_signature,
      nonce: data.signature_nonce,
      message: data.message,
    };
  } catch (error) {
    console.error("Error in verifyInvite:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
