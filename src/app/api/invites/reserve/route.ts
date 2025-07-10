import { NextRequest, NextResponse } from "next/server";
import { getAddress, Hash, TypedDataDefinition } from "viem";
import { z } from "zod";
import { verifyNetworkInviteSignature } from "@/lib/eip712";
import { validateApiToken } from "@/lib/utils/api-auth";
import { DB } from "@/lib/database/service";
import { randomUUID } from "crypto";

const validateRequestSchema = z.object({
  signature: z.string().startsWith("0x"),
  // We only care that the typedData contains a nonce for lookup; the full
  // structure is validated implicitly by the signature check.
  typedData: z.unknown(),
  recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid recipient address"),
  inviterAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid inviter address"),
});

export async function POST(request: NextRequest) {
  try {
    // Check bearer token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    if (!validateApiToken(token)) {
      console.error("Unauthorized token used in call to /api/invites/reserve");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = validateRequestSchema.parse(body);
    console.log("validatedData", validatedData);
    const { signature, typedData, recipient, inviterAddress } = validatedData;

    // 1. Verify EIP-712 signature
    const isValidSignature = await verifyNetworkInviteSignature({
      typedData: typedData as unknown as TypedDataDefinition,
      signature: signature as Hash,
      address: getAddress(inviterAddress),
    });

    if (!isValidSignature) {
      await DB.logSecurityEvent({
        event_type: "invalid_signature",
        inviter_address: inviterAddress,
        recipient_address: recipient,
        nonce: (typedData as any).message.nonce as string,
        signature,
        ip_address: request.headers.get("x-forwarded-for"),
        user_agent: request.headers.get("user-agent"),
        metadata: { endpoint: "validate" },
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // 2. Find invitation by signature (traditional invite flow)
    const invitation = await DB.findInvitation({
      inviter_address_and_nonce: {
        inviter_address: inviterAddress,
        nonce: (typedData as any).message.nonce as string,
      },
    });

    if (invitation?.flow_type !== "invite") {
      return NextResponse.json(
        { error: "Invalid flow type. Only call with invite flow type." },
        { status: 400 }
      );
    }

    if (!invitation || !invitation.invite_code) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    // 3. Check invitation status using view
    const status = await DB.getInvitationStatus(invitation.id);
    if (!status) {
      return NextResponse.json({ error: "Invitation status not available" }, { status: 404 });
    }

    if (status.status !== "pending") {
      if (status.status === "reserved") {
        return NextResponse.json({ error: "Invite already reserved" }, { status: 400 });
      }
      if (status.status === "completed") {
        return NextResponse.json({ error: "Invite already used" }, { status: 400 });
      }
    }

    // 4. Check invite hasn't expired
    const currentTime = new Date();
    const expiresAt = new Date(invitation.expires_at);

    if (currentTime > expiresAt) {
      return NextResponse.json({ error: "Invite has expired" }, { status: 400 });
    }

    // 5. Create reservation
    const reservationId = randomUUID();
    const reservationExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await DB.createReservation({
      invitation_id: invitation.id,
      reservation_id: reservationId,
      recipient_address: recipient,
      expires_at: reservationExpiresAt.toISOString(),
    });

    // 6. Log audit events
    await DB.logAudit({
      entity_type: "reservation",
      entity_id: invitation.id,
      action: "reserve",
      actor_address: inviterAddress,
      metadata: { recipient, flow_type: "invite" },
    });

    return NextResponse.json({
      reservationId,
      inviterAddress,
      expiresAt: reservationExpiresAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Invalid request format", error);
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 });
    }
    console.error("Error in /api/invites/reserve:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
