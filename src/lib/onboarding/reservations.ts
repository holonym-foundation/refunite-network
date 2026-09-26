import { randomUUID } from "crypto";
import { getAddress, Hash, TypedDataDefinition } from "viem";
import { z } from "zod";

import { DB } from "@/lib/database/service";
import { verifyDirectOnboardSignature, verifyNetworkInviteSignature } from "@/lib/eip712";
import { unmarshalTypedData } from "@/lib/utils/serialize";
import { DeviceInfo } from "@/lib/database/types";

// --------------------------------------------------
// Zod Schemas (shared)
// --------------------------------------------------

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

const directOnboardSchema = z.object({
  signature: z.string().startsWith("0x"),
  typedData: z.unknown(),
  recipient: addressSchema,
  inviterAddress: addressSchema,
  deviceInfo: z
    .object({
      userAgent: z.string(),
      ipAddress: z.string(),
    })
    .partial()
    .optional(),
});

const inviteReserveSchema = z.object({
  signature: z.string().startsWith("0x"),
  typedData: z.unknown(),
  recipient: addressSchema,
  inviterAddress: addressSchema,
  deviceInfo: z
    .object({
      userAgent: z.string(),
      ipAddress: z.string(),
    })
    .partial()
    .optional(),
});

const confirmSchema = z.object({
  reservationId: z.string().uuid(),
  mintHatTxHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/)
    .nullable(), // null when a resumed onboarding only added the signer
  claimSignerTxHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  recipient: addressSchema,
  deviceInfo: z
    .object({
      userAgent: z.string(),
      ipAddress: z.string(),
    })
    .partial()
    .optional(),
});

const rollbackSchema = z.object({
  reservationId: z.string().uuid(),
  reason: z.string(),
  deviceInfo: z
    .object({
      userAgent: z.string(),
      ipAddress: z.string(),
    })
    .partial()
    .optional(),
});

// --------------------------------------------------
// Public helpers
// --------------------------------------------------

// Reservation expiry duration (in milliseconds)
export const RESERVATION_EXPIRY_MS = 60 * 1000; // 60 seconds

export async function createDirectReservation(params: {
  signature: Hash;
  typedData: TypedDataDefinition | unknown;
  recipient: string;
  inviterAddress: string;
  deviceInfo?: Partial<DeviceInfo>;
}): Promise<{ success: boolean; reservationId?: string; error?: string }> {
  try {
    const data = directOnboardSchema.parse(params);
    const { signature, typedData, recipient, inviterAddress, deviceInfo } = data;

    // Verify EIP-712 signature (direct onboarding)
    const unmarshaled =
      typeof typedData === "string"
        ? unmarshalTypedData(typedData)
        : (typedData as TypedDataDefinition);

    const isValidSignature = await verifyDirectOnboardSignature({
      typedData: unmarshaled as TypedDataDefinition,
      signature: signature as Hash,
      address: getAddress(inviterAddress),
      expectedRecipient: getAddress(recipient),
    });

    if (!isValidSignature) {
      await DB.logSecurityEventWithDeviceInfo(
        {
          event_type: "invalid_signature",
          inviter_address: inviterAddress,
          recipient_address: recipient,
          nonce: (typedData as any).message?.nonce ?? "",
          signature,
          ip_address: null,
          user_agent: null,
          metadata: { flow_type: "direct" },
        },
        deviceInfo
      );
      return { success: false, error: "Invalid signature" };
    }

    // Nonce replay protection
    const existingInvitation = await DB.findInvitation({
      inviter_address_and_nonce: {
        inviter_address: inviterAddress,
        nonce: (typedData as any).message?.nonce,
      },
    });

    if (existingInvitation) {
      await DB.logSecurityEventWithDeviceInfo(
        {
          event_type: "replay_attempt",
          inviter_address: inviterAddress,
          recipient_address: recipient,
          signature,
          nonce: (typedData as any).message?.nonce,
          ip_address: null,
          user_agent: null,
          metadata: { type: "nonce_reuse", flow_type: "direct" },
        },
        deviceInfo
      );
      return { success: false, error: "Nonce already used" };
    }

    // Create invitation & reservation
    const reservationId = randomUUID();
    const expiresAt = new Date(Date.now() + RESERVATION_EXPIRY_MS);

    const invitation = await DB.createInvitation({
      invite_code: null,
      flow_type: "direct",
      inviter_address: inviterAddress,
      recipient_address: recipient,
      signature,
      typed_data: typedData,
      nonce: (typedData as any).message?.nonce,
      expires_at: expiresAt.toISOString(),
    });

    await DB.createReservation({
      invitation_id: invitation.id,
      reservation_id: reservationId,
      recipient_address: recipient,
      expires_at: expiresAt.toISOString(),
    });

    await DB.logAuditWithDeviceInfo(
      {
        entity_type: "invitation",
        entity_id: invitation.id,
        action: "create",
        actor_address: inviterAddress,
        metadata: { flow_type: "direct", recipient },
      },
      deviceInfo
    );

    await DB.logAuditWithDeviceInfo(
      {
        entity_type: "reservation",
        entity_id: invitation.id,
        action: "reserve",
        actor_address: inviterAddress,
        metadata: { invitation_id: invitation.id, flow_type: "direct" },
      },
      deviceInfo
    );

    return { success: true, reservationId };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: "Invalid request format" };
    }
    console.error("createDirectReservation error", err);
    return { success: false, error: "Internal error" };
  }
}

export async function reserveInvite(params: {
  signature: Hash;
  typedData: TypedDataDefinition | unknown;
  recipient: string;
  inviterAddress: string;
  deviceInfo?: Partial<DeviceInfo>;
}): Promise<{ success: boolean; reservationId?: string; error?: string }> {
  try {
    const data = inviteReserveSchema.parse(params);
    const { signature, typedData, recipient, inviterAddress, deviceInfo } = data;

    // Verify signature (invite flow)
    const isValidSignature = await verifyNetworkInviteSignature({
      typedData: typedData as unknown as TypedDataDefinition,
      signature: signature as Hash,
      address: getAddress(inviterAddress),
    });

    if (!isValidSignature) {
      await DB.logSecurityEventWithDeviceInfo(
        {
          event_type: "invalid_signature",
          inviter_address: inviterAddress,
          recipient_address: recipient,
          nonce: (typedData as any).message?.nonce,
          signature,
          ip_address: null,
          user_agent: null,
          metadata: { endpoint: "reserve" },
        },
        deviceInfo
      );
      return { success: false, error: "Invalid signature" };
    }

    // Retrieve invitation by inviter + nonce
    const invitation = await DB.findInvitation({
      inviter_address_and_nonce: {
        inviter_address: inviterAddress,
        nonce: (typedData as any).message?.nonce,
      },
    });

    if (!invitation || !invitation.invite_code) {
      return { success: false, error: "Invite not found" };
    }

    if (invitation.flow_type !== "invite") {
      return { success: false, error: "Invalid flow type" };
    }

    // Check status
    const status = await DB.getInvitationStatus(invitation.id);
    if (!status || status.status !== "pending") {
      return {
        success: false,
        error: status?.status === "reserved" ? "Invite already reserved" : "Invite already used",
      };
    }

    // Expiry check
    if (new Date() > new Date(invitation.expires_at)) {
      return { success: false, error: "Invite has expired" };
    }

    // Create reservation
    const reservationId = randomUUID();
    const reservationExpiresAt = new Date(Date.now() + RESERVATION_EXPIRY_MS);

    await DB.createReservation({
      invitation_id: invitation.id,
      reservation_id: reservationId,
      recipient_address: recipient,
      expires_at: reservationExpiresAt.toISOString(),
    });

    await DB.logAuditWithDeviceInfo(
      {
        entity_type: "reservation",
        entity_id: invitation.id,
        action: "reserve",
        actor_address: inviterAddress,
        metadata: { recipient, flow_type: "invite" },
      },
      deviceInfo
    );

    return { success: true, reservationId };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: "Invalid request format" };
    }
    console.error("reserveInvite error", err);
    return { success: false, error: "Internal error" };
  }
}

export async function confirmReservation(params: {
  reservationId: string;
  mintHatTxHash: string | null;
  claimSignerTxHash: string;
  recipient: string;
  deviceInfo?: Partial<DeviceInfo>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const data = confirmSchema.parse(params);
    const { reservationId, mintHatTxHash, claimSignerTxHash, recipient, deviceInfo } = data;

    const reservation = await DB.findActiveReservation(reservationId);
    if (!reservation) {
      return { success: false, error: "Reservation not found" };
    }

    const invitation = await DB.findInvitation({ id: reservation.invitation_id });
    if (!invitation) {
      return { success: false, error: "Invitation not found" };
    }

    if (reservation.recipient_address.toLowerCase() !== recipient.toLowerCase()) {
      await DB.logSecurityEventWithDeviceInfo(
        {
          event_type: "recipient_mismatch",
          inviter_address: "",
          recipient_address: recipient,
          signature: "",
          nonce: "",
          ip_address: null,
          user_agent: null,
          metadata: {
            reservation_id: reservationId,
            expected_recipient: reservation.recipient_address,
          },
        },
        deviceInfo
      );
      return { success: false, error: "Recipient mismatch" };
    }

    const now = new Date();
    if (now > new Date(reservation.expires_at)) {
      await DB.releaseReservation(reservationId, "expired");
      await DB.logSecurityEventWithDeviceInfo(
        {
          event_type: "expired_reservation",
          inviter_address: "",
          recipient_address: recipient,
          signature: "",
          nonce: "",
          ip_address: null,
          user_agent: null,
          metadata: { reservation_id: reservationId, expired_at: reservation.expires_at },
        },
        deviceInfo
      );
      return { success: false, error: "Reservation expired" };
    }

    const completion = await DB.createCompletion({
      invitation_id: reservation.invitation_id,
      reservation_id: reservationId,
      recipient_address: recipient,
      mint_hat_tx_hash: mintHatTxHash,
      claim_signer_tx_hash: claimSignerTxHash,
    });

    await DB.releaseReservation(reservationId, "completed");

    await DB.logAuditWithDeviceInfo(
      {
        entity_type: "completion",
        entity_id: completion.id,
        action: "complete",
        actor_address: recipient,
        metadata: {
          recipient,
          authorizing_actor: invitation.inviter_address,
          flow_type: invitation.flow_type,
          mint_hat_tx_hash: mintHatTxHash,
          claim_signer_tx_hash: claimSignerTxHash,
        },
      },
      deviceInfo
    );

    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: "Invalid request format" };
    }
    console.error("confirmReservation error", err);
    return { success: false, error: "Internal error" };
  }
}

export async function rollbackReservation(params: {
  reservationId: string;
  reason: string;
  deviceInfo?: Partial<DeviceInfo>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const data = rollbackSchema.parse(params);
    const { reservationId, reason, deviceInfo } = data;

    const reservation = await DB.findActiveReservation(reservationId);
    if (!reservation) {
      return { success: false, error: "Reservation not found" };
    }

    const invitation = await DB.findInvitation({ id: reservation.invitation_id });
    if (!invitation) {
      return { success: false, error: "Invitation not found" };
    }

    await DB.releaseReservation(reservationId, "rollback");

    await DB.logAuditWithDeviceInfo(
      {
        entity_type: "reservation",
        entity_id: reservation.id,
        action: "rollback",
        actor_address: null,
        metadata: {
          reason,
          rollback: true,
          recipient: reservation.recipient_address,
          authorizing_actor: invitation.inviter_address,
          flow_type: invitation.flow_type,
        },
      },
      deviceInfo
    );

    console.log(`Rolled back reservation ${reservationId} – Reason: ${reason}`);

    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: "Invalid request format" };
    }
    console.error("rollbackReservation error", err);
    return { success: false, error: "Internal error" };
  }
}
