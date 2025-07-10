import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateApiToken } from "@/lib/utils/api-auth";
import { DB } from "@/lib/database/service";

const confirmRequestSchema = z.object({
  reservationId: z.string().uuid(),
  mintHatTxHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash"),
  claimSignerTxHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash"),
  recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid recipient address"),
});

export async function POST(request: NextRequest) {
  try {
    // Check bearer token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("Unauthorized token used in call to /api/reservations/confirm");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    if (!validateApiToken(token)) {
      console.error("Unauthorized token used in call to /api/reservations/confirm");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = confirmRequestSchema.parse(body);
    const { reservationId, mintHatTxHash, claimSignerTxHash, recipient } = validatedData;

    // 1. Find and validate reservation
    const reservation = await DB.findActiveReservation(reservationId);
    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    // 2. Get invitation details for inviter address
    const invitation = await DB.findInvitation({ id: reservation.invitation_id });
    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (reservation.recipient_address.toLowerCase() !== recipient.toLowerCase()) {
      await DB.logSecurityEvent({
        event_type: "recipient_mismatch",
        inviter_address: "", // Not critical for this mismatch
        recipient_address: recipient,
        signature: "",
        nonce: "",
        ip_address: request.headers.get("x-forwarded-for"),
        user_agent: request.headers.get("user-agent"),
        metadata: {
          reservation_id: reservationId,
          expected_recipient: reservation.recipient_address,
        },
      });
      return NextResponse.json({ error: "Recipient mismatch" }, { status: 403 });
    }

    // 3. Check reservation hasn't expired
    const now = new Date();
    const expiresAt = new Date(reservation.expires_at);

    if (now > expiresAt) {
      // Auto-release expired reservation
      await DB.releaseReservation(reservationId, "expired");
      await DB.logSecurityEvent({
        event_type: "expired_reservation",
        inviter_address: "",
        recipient_address: recipient,
        signature: "",
        nonce: "",
        ip_address: request.headers.get("x-forwarded-for"),
        user_agent: request.headers.get("user-agent"),
        metadata: { reservation_id: reservationId, expired_at: expiresAt.toISOString() },
      });
      return NextResponse.json({ error: "Reservation expired" }, { status: 409 });
    }

    // 4. Create completion record
    const completion = await DB.createCompletion({
      invitation_id: reservation.invitation_id,
      reservation_id: reservationId,
      recipient_address: recipient,
      mint_hat_tx_hash: mintHatTxHash,
      claim_signer_tx_hash: claimSignerTxHash,
    });

    // 5. Release reservation (mark as completed)
    await DB.releaseReservation(reservationId, "completed");

    // 6. Log audit events with multi-actor design
    await DB.logAudit({
      entity_type: "completion",
      entity_id: completion.id,
      action: "complete",
      actor_address: recipient, // Primary actor: who got onboarded
      metadata: {
        recipient,
        authorizing_actor: invitation.inviter_address, // Who authorized this action
        flow_type: invitation.flow_type, // direct or invite
        mint_hat_tx_hash: mintHatTxHash,
        claim_signer_tx_hash: claimSignerTxHash,
      },
    });

    return NextResponse.json({
      success: true,
      usedAt: completion.completed_at,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 });
    }
    console.error("Error in /api/reservations/confirm:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
