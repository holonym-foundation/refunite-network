// Database entity types matching our normalized schema

// Device information for audit logs
export interface DeviceInfo {
  deviceType: string;
  platform: string;
  browser: string;
  browserVersion: string;
  userAgent: string;
  screenWidth?: number;
  screenHeight?: number;
  screenResolution?: string;
  os: string;
  osVersion: string;
  language: string;
  timezone: string;
  connectionType?: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  collectedAt: string;
  environment: "client" | "server";
}

// Audit log metadata structure
export interface AuditLogMetadata {
  deviceInfo?: Partial<DeviceInfo>;
  ipAddress?: string;
  [key: string]: any; // Allow additional metadata
}

export interface Invitation {
  id: number;
  invite_code: string | null;
  flow_type: "invite" | "direct";
  inviter_address: string;
  recipient_address: string | null;
  signature: string;
  typed_data: any;
  nonce: string;
  created_at: string;
  expires_at: string;
}

export interface Reservation {
  id: number;
  invitation_id: number;
  reservation_id: string;
  recipient_address: string;
  reserved_at: string;
  expires_at: string;
  released_at: string | null;
  release_reason: string | null;
}

export interface Completion {
  id: number;
  invitation_id: number;
  reservation_id: string;
  recipient_address: string;
  completed_at: string;
  mint_hat_tx_hash: string;
  claim_signer_tx_hash: string;
}

export interface AuditLogEntry {
  id?: number;
  entity_type: "invitation" | "reservation" | "completion" | "beneficiary";
  entity_id: number;
  action: "create" | "reserve" | "complete" | "expire" | "rollback";
  actor_address: string | null;
  metadata: AuditLogMetadata;
  timestamp?: string;
}

export interface SecurityEvent {
  id?: number;
  event_type:
    | "replay_attempt"
    | "invalid_signature"
    | "expired_signature"
    | "expired_reservation"
    | "recipient_mismatch"
    | "not_leader"
    | "not_beneficiary";
  inviter_address: string | null;
  recipient_address: string | null;
  signature: string | null;
  nonce: string | null;
  ip_address: string | null;
  user_agent: string | null;
  timestamp?: string;
  metadata: any;
}

export interface Beneficiary {
  id: string;
  eth_address: string;
  stellar_address: string;
  added_by: string;
  created_at: string;
}

// Input types for creating entities
export interface CreateInvitationData {
  invite_code: string | null;
  flow_type: "invite" | "direct";
  inviter_address: string;
  recipient_address: string | null;
  signature: string;
  typed_data: any;
  nonce: string;
  expires_at: string;
}

export interface CreateReservationData {
  invitation_id: number;
  reservation_id: string;
  recipient_address: string;
  expires_at: string;
}

export interface CreateCompletionData {
  invitation_id: number;
  reservation_id: string;
  recipient_address: string;
  mint_hat_tx_hash: string;
  claim_signer_tx_hash: string;
}

// Query types
export interface FindInvitationWhere {
  id?: number;
  invite_code?: string;
  inviter_address?: string;
  nonce?: string;
  inviter_address_and_nonce?: { inviter_address: string; nonce: string };
}

// View types
export interface InvitationStatus {
  id: number;
  invite_code: string | null;
  flow_type: "invite" | "direct";
  inviter_address: string;
  recipient_address: string | null;
  created_at: string;
  expires_at: string;
  status: "pending" | "reserved" | "released" | "completed" | "expired";
  reservation_id: string | null;
  reserved_at: string | null;
  reservation_expires_at: string | null;
  release_reason: string | null;
  completed_at: string | null;
  mint_hat_tx_hash: string | null;
  claim_signer_tx_hash: string | null;
}
