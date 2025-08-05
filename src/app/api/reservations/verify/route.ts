import { NextRequest, NextResponse } from "next/server";
import { getAddress, Hash, TypedDataDefinition } from "viem";
import { z } from "zod";
import { verifyNetworkInviteSignature, verifyDirectOnboardSignature } from "@/lib/eip712";
import { validateApiToken } from "@/lib/utils/api-auth";
import { DB } from "@/lib/database/service";
import { unmarshalTypedData } from "@/lib/utils/serialize";

// Force static generation for mobile builds
export const dynamic = "force-static";

const verifyReservationSchema = z.object({
  reservationId: z.string().uuid(),
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
      console.log("Unauthorized token used in call to /api/reservations/verify");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    if (!validateApiToken(token)) {
      console.error("Unauthorized token used in call to /api/reservations/verify");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse and validate request
    const body = await request.json();
    const data = verifyReservationSchema.parse(body);
    const { reservationId, signature, typedData, recipient, inviterAddress } = data;

    // 3. Verify reservation exists and is valid
    const reservation = await DB.findActiveReservation(reservationId);
    if (!reservation) {
      console.error("Reservation not found", { reservationId });
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    // 4. Verify reservation matches the provided data
    if (reservation.recipient_address !== recipient) {
      console.error("Reservation recipient mismatch", {
        reservationId,
        expected: reservation.recipient_address,
        provided: recipient,
      });
      return NextResponse.json({ error: "Reservation recipient mismatch" }, { status: 400 });
    }

    // 5. Verify reservation is not expired
    if (new Date(reservation.expires_at) < new Date()) {
      console.error("Reservation expired", { reservationId, expiresAt: reservation.expires_at });
      return NextResponse.json({ error: "Reservation expired" }, { status: 400 });
    }

    // 6. Get invitation to determine flow type
    const invitation = await DB.findInvitation({ id: reservation.invitation_id });
    if (!invitation) {
      console.error("Invitation not found for reservation", {
        reservationId,
        invitationId: reservation.invitation_id,
      });
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    // 7. Verify signature matches the stored signature
    if (invitation.signature !== signature) {
      console.error("Signature mismatch", { reservationId });
      return NextResponse.json({ error: "Signature mismatch" }, { status: 400 });
    }

    // 8. Re-verify the EIP-712 signature based on flow type
    const unmarshaledTypedData = unmarshalTypedData(typedData);
    let isValidSignature = false;

    if (invitation.flow_type === "invite") {
      // For invite flow, the typedData does not contain a recipient field
      isValidSignature = await verifyNetworkInviteSignature({
        typedData: unmarshaledTypedData as TypedDataDefinition,
        signature: signature as Hash,
        address: getAddress(inviterAddress),
      });
    } else if (invitation.flow_type === "direct") {
      // For direct flow, the typedData contains a recipient field
      isValidSignature = await verifyDirectOnboardSignature({
        typedData: unmarshaledTypedData as TypedDataDefinition,
        signature: signature as Hash,
        address: getAddress(inviterAddress),
        expectedRecipient: getAddress(recipient),
      });
    } else {
      console.error("Invalid flow type", { reservationId, flowType: invitation.flow_type });
      return NextResponse.json({ error: "Invalid flow type" }, { status: 400 });
    }

    if (!isValidSignature) {
      console.error("Invalid signature verification", {
        reservationId,
        flowType: invitation.flow_type,
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // 9. All checks passed - reservation is valid
    console.log("Reservation verified successfully", {
      reservationId,
      recipient,
      flowType: invitation.flow_type,
    });
    return NextResponse.json({
      valid: true,
      reservationId,
      recipient,
      inviterAddress,
      flowType: invitation.flow_type,
      expiresAt: reservation.expires_at,
    });
  } catch (error) {
    console.error("Verify reservation error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request format",
          details: error.errors.map((e) => e.message),
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
