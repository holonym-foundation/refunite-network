import { INVITE_TTL_SECONDS } from "@/lib/constants";
import { utcAddSeconds, utcNow } from "@/lib/utils/date";
import { DB } from "@/lib/database/service";
import { DeviceInfo } from "@/lib/database/types";
import { verifyNetworkInviteSignature } from "@/lib/eip712";
import { sendInviteCreatedMessage } from "@/lib/slack/webhook";
import { unmarshalTypedData } from "@/lib/utils/serialize";
import { randomBytes } from "crypto";
import { getAddress, Hash } from "viem";

export type VerifyInviteResult = {
  success: boolean;
  error?: string;
  inviterAddress?: string;
  signature?: string;
  typedData?: any;
  expiresAt?: string;
  isExpired?: boolean;
};

export type CreateInviteResult = {
  success: boolean;
  inviteCode?: string;
  error?: string;
};

const SIGNATURE_TTL_SECONDS = 300; // 5 minutes;

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
  typedData: any,
  deviceInfo?: Partial<DeviceInfo>
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

    // Check if signature creation time is not too old
    const signatureTimestamp = Number(createdAt);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (currentTimestamp - signatureTimestamp > SIGNATURE_TTL_SECONDS) {
      return { success: false, error: "Signature has expired" };
    }

    // Generate unique invite code
    const inviteCode = generateInviteCode();

    // Create invitation with UTC timestamp
    const expiresAt = utcAddSeconds(INVITE_TTL_SECONDS);

    const invitation = await DB.createInvitation({
      invite_code: inviteCode,
      flow_type: "invite",
      inviter_address: inviterAddress,
      recipient_address: null, // Not known yet for invite flow
      signature,
      typed_data: typedData,
      nonce,
      expires_at: expiresAt.toISOString(),
    });

    // Log audit event with device info
    await DB.logAuditWithDeviceInfo(
      {
        entity_type: "invitation",
        entity_id: invitation.id,
        action: "create",
        actor_address: inviterAddress,
        metadata: { flow_type: "invite", invite_code: inviteCode },
      },
      deviceInfo
    );

    await sendInviteCreatedMessage({
      inviterAddress,
      inviteCode,
      deviceInfo,
    });

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
    const invitation = await DB.findInvitation({ invite_code: inviteCode });

    if (!invitation) {
      return { success: false, error: "Invalid invite code" };
    }

    // Unmarshal any BigInt values in typed_data
    const data = {
      ...invitation,
      typed_data: unmarshalTypedData(invitation.typed_data),
    };

    return { success: true, data };
  } catch (error) {
    console.error("Error in getInviteByCode:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function verifyInvite(inviteCode: string): Promise<VerifyInviteResult> {
  try {
    const invitation = await DB.findInvitation({ invite_code: inviteCode });

    if (!invitation) {
      return { success: false, error: "Invalid invite code" };
    }

    // Get invitation status using view
    const status = await DB.getInvitationStatus(invitation.id);
    if (!status) {
      return { success: false, error: "Invalid invite code" };
    }

    const expiresAt = invitation.expires_at;
    const isExpired = utcNow() > new Date(expiresAt);

    // Check expiry first (application-level check)
    if (isExpired) {
      return {
        success: false,
        error: "Invite has expired",
        expiresAt,
        isExpired: true,
      };
    }

    // Check database status
    if (status.status === "completed") {
      return {
        success: false,
        error: "Invite has already been used",
        expiresAt,
        isExpired: false,
      };
    }

    if (status.status === "reserved") {
      return {
        success: false,
        error: "Invite is currently reserved",
        expiresAt,
        isExpired: false,
      };
    }

    const typedData = unmarshalTypedData(invitation.typed_data);

    return {
      success: true,
      inviterAddress: invitation.inviter_address,
      signature: invitation.signature,
      typedData,
      expiresAt,
      isExpired: false,
    };
  } catch (error) {
    console.error("Error in verifyInvite:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
