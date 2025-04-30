import { NextResponse } from "next/server";

import { supabase } from "@/lib/supabase/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nonce } = body;

    if (!nonce) {
      return NextResponse.json({ error: "Nonce is required" }, { status: 400 });
    }

    // Only check if the nonce exists and hasn't been used
    const { data: invite, error } = await supabase
      .from("invites")
      .select("id, used_at")
      .eq("signature_nonce", nonce)
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to verify nonce" }, { status: 500 });
    }

    if (!invite) {
      return NextResponse.json({ error: "Invalid nonce" }, { status: 400 });
    }

    if (invite.used_at) {
      return NextResponse.json({ error: "Invite has already been used" }, { status: 400 });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("Error in verify-nonce:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
