import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateApiToken } from "@/lib/utils/api-auth";
import { DB } from "@/lib/database/service";

const rollbackRequestSchema = z.object({
  reservationId: z.string().uuid(),
  reason: z.string(),
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
      console.error("Unauthorized token used in call to /api/reservations/rollback");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = rollbackRequestSchema.parse(body);
    const { reservationId, reason } = validatedData;

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

    // 3. Release reservation
    await DB.releaseReservation(reservationId, "rollback");
    const releasedAt = new Date();

    // 4. Log audit event with multi-actor design
    await DB.logAudit({
      entity_type: "reservation",
      entity_id: reservation.id,
      action: "rollback",
      actor_address: null, // System action (cleanup/rollback)
      metadata: {
        reason,
        rollback: true,
        recipient: reservation.recipient_address,
        authorizing_actor: invitation.inviter_address,
        flow_type: invitation.flow_type,
      },
    });

    // 5. Log rollback for debugging
    console.log(
      `Rolled back reservation ${reservationId} for invitation ${reservation.invitation_id}. Reason: ${reason}`
    );

    return NextResponse.json({
      success: true,
      releasedAt: releasedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 });
    }
    console.error("Error in /api/reservations/rollback:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
