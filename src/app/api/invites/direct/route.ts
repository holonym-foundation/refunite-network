import { NextRequest, NextResponse } from "next/server";
import { getAddress, Hash, TypedDataDefinition } from "viem";
import { z } from "zod";
import { verifyDirectOnboardSignature } from "@/lib/eip712";
import { validateApiToken } from "@/lib/utils/api-auth";
import { DB } from "@/lib/database/service";
import { randomUUID } from "crypto";
import { unmarshalTypedData } from "@/lib/utils/serialize";

const directOnboardSchema = z.object({
  // Minimal validation: ensure we have a signature, a nonce for replay protection,
  // and the basic addresses. The full structure is implicitly validated during
  // EIP-712 signature verification.
  signature: z.string().startsWith("0x"),
  typedData: z.unknown(),
  recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid recipient address"),
  inviterAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid inviter address"),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Validate authentication
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    if (!validateApiToken(token)) {
      console.error("Unauthorized token used in call to /api/invites/direct");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse and validate request
    const body = await request.json();
    const data = directOnboardSchema.parse(body);
    const { signature, typedData, recipient, inviterAddress } = data;

    // 3. Extract client information for security logging
    const clientIP = request.headers.get("x-forwarded-for") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // 4. Enhanced EIP-712 signature verification
    const unmarshaledTypedData = unmarshalTypedData(typedData);
    const isValidSignature = await verifyDirectOnboardSignature({
      typedData: unmarshaledTypedData as TypedDataDefinition,
      signature: signature as Hash,
      address: getAddress(inviterAddress),
      expectedRecipient: getAddress(recipient),
    });

    if (!isValidSignature) {
      await DB.logSecurityEvent({
        event_type: "invalid_signature",
        inviter_address: inviterAddress,
        recipient_address: recipient,
        nonce: (typedData as any).message.nonce,
        signature,
        ip_address: clientIP,
        user_agent: userAgent,
        metadata: { flow_type: "direct" },
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // 5. Nonce replay protection (after successful verification)
    const existingInvitation = await DB.findInvitation({
      inviter_address_and_nonce: {
        inviter_address: inviterAddress,
        nonce: (typedData as any).message.nonce,
      },
    });

    if (existingInvitation) {
      await DB.logSecurityEvent({
        event_type: "replay_attempt",
        inviter_address: inviterAddress,
        recipient_address: recipient,
        signature,
        nonce: (typedData as any).message.nonce,
        ip_address: clientIP,
        user_agent: userAgent,
        metadata: { type: "nonce_reuse", flow_type: "direct" },
      });
      return NextResponse.json({ error: "Nonce already used" }, { status: 409 });
    }

    // 6. Create invitation and reservation atomically
    const reservationId = randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create invitation
    const invitation = await DB.createInvitation({
      invite_code: null, // Direct onboarding has no invite code
      flow_type: "direct",
      inviter_address: inviterAddress,
      recipient_address: recipient, // Known immediately for direct onboarding
      signature,
      typed_data: typedData,
      nonce: (typedData as any).message.nonce,
      expires_at: expiresAt.toISOString(),
    });

    // Create reservation
    await DB.createReservation({
      invitation_id: invitation.id,
      reservation_id: reservationId,
      recipient_address: recipient,
      expires_at: expiresAt.toISOString(),
    });

    // 7. Audit logging
    await DB.logAudit({
      entity_type: "invitation",
      entity_id: invitation.id,
      action: "create",
      actor_address: inviterAddress,
      metadata: { flow_type: "direct", recipient, endpoint: "direct-onboard" },
    });

    await DB.logAudit({
      entity_type: "reservation",
      entity_id: invitation.id,
      action: "reserve",
      actor_address: inviterAddress,
      metadata: { invitation_id: invitation.id, flow_type: "direct" },
    });

    return NextResponse.json({
      reservationId,
      inviterAddress,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.log("Something went wrong", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request format",
          details: error.errors.map((e) => e.message),
        },
        { status: 400 }
      );
    }
    console.error("Direct onboard error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
