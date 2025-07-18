import client from "@/client/turso";
import { marshalTypedData } from "@/lib/utils/serialize";
import {
  Invitation,
  Reservation,
  Completion,
  AuditLogEntry,
  SecurityEvent,
  CreateInvitationData,
  CreateReservationData,
  CreateCompletionData,
  FindInvitationWhere,
  InvitationStatus,
} from "./types";

export class DB {
  // =====================================================
  // INVITATIONS
  // =====================================================

  static async createInvitation(data: CreateInvitationData): Promise<Invitation> {
    const result = await client.execute({
      sql: `INSERT INTO invitations (
        invite_code, flow_type, inviter_address, recipient_address,
        signature, typed_data, nonce, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *`,
      args: [
        data.invite_code,
        data.flow_type,
        data.inviter_address,
        data.recipient_address,
        data.signature,
        JSON.stringify(marshalTypedData(data.typed_data)),
        data.nonce,
        data.expires_at,
      ],
    });

    return result.rows[0] as unknown as Invitation;
  }

  static async findInvitation(where: FindInvitationWhere): Promise<Invitation | null> {
    let sql = "SELECT * FROM invitations WHERE ";
    let args: any[] = [];

    if (where.id) {
      sql += "id = ?";
      args.push(where.id);
    } else if (where.invite_code) {
      sql += "invite_code = ?";
      args.push(where.invite_code);
    } else if (where.inviter_address_and_nonce) {
      sql += "inviter_address = ? AND nonce = ?";
      args.push(
        where.inviter_address_and_nonce.inviter_address,
        where.inviter_address_and_nonce.nonce
      );
    } else {
      throw new Error("Invalid where clause for findInvitation");
    }

    const result = await client.execute({ sql, args });
    return result.rows.length > 0 ? (result.rows[0] as unknown as Invitation) : null;
  }

  static async getInvitationStatus(invitationId: number): Promise<InvitationStatus | null> {
    const result = await client.execute({
      sql: "SELECT * FROM invitation_status WHERE id = ?",
      args: [invitationId],
    });

    return result.rows.length > 0 ? (result.rows[0] as unknown as InvitationStatus) : null;
  }

  // =====================================================
  // RESERVATIONS
  // =====================================================

  static async createReservation(data: CreateReservationData): Promise<Reservation> {
    const result = await client.execute({
      sql: `INSERT INTO reservations (
        invitation_id, reservation_id, recipient_address, expires_at
      ) VALUES (?, ?, ?, ?)
      RETURNING *`,
      args: [data.invitation_id, data.reservation_id, data.recipient_address, data.expires_at],
    });

    return result.rows[0] as unknown as Reservation;
  }

  static async findActiveReservation(reservationId: string): Promise<Reservation | null> {
    const result = await client.execute({
      sql: "SELECT * FROM reservations WHERE reservation_id = ? AND released_at IS NULL",
      args: [reservationId],
    });

    return result.rows.length > 0 ? (result.rows[0] as unknown as Reservation) : null;
  }

  static async releaseReservation(reservationId: string, reason: string): Promise<void> {
    await client.execute({
      sql: "UPDATE reservations SET released_at = CURRENT_TIMESTAMP, release_reason = ? WHERE reservation_id = ?",
      args: [reason, reservationId],
    });
  }

  // =====================================================
  // COMPLETIONS
  // =====================================================

  static async createCompletion(data: CreateCompletionData): Promise<Completion> {
    const result = await client.execute({
      sql: `INSERT INTO completions (
        invitation_id, reservation_id, recipient_address,
        mint_hat_tx_hash, claim_signer_tx_hash
      ) VALUES (?, ?, ?, ?, ?)
      RETURNING *`,
      args: [
        data.invitation_id,
        data.reservation_id,
        data.recipient_address,
        data.mint_hat_tx_hash,
        data.claim_signer_tx_hash,
      ],
    });

    return result.rows[0] as unknown as Completion;
  }

  // =====================================================
  // SECURITY EVENTS
  // =====================================================

  static async logSecurityEvent(event: SecurityEvent): Promise<void> {
    await client.execute({
      sql: `INSERT INTO security_events (
        event_type, inviter_address, recipient_address, signature, nonce,
        ip_address, user_agent, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        event.event_type,
        event.inviter_address,
        event.recipient_address,
        event.signature,
        event.nonce,
        event.ip_address,
        event.user_agent,
        JSON.stringify(event.metadata),
      ],
    });
  }

  // =====================================================
  // AUDIT LOGGING
  // =====================================================

  static async logAudit(entry: AuditLogEntry): Promise<void> {
    await client.execute({
      sql: `INSERT INTO audit_log (
        entity_type, entity_id, action, actor_address, metadata
      ) VALUES (?, ?, ?, ?, ?)`,
      args: [
        entry.entity_type,
        entry.entity_id,
        entry.action,
        entry.actor_address,
        JSON.stringify(entry.metadata),
      ],
    });
  }

  // =====================================================
  // CLEANUP OPERATIONS
  // =====================================================

  static async cleanupExpiredReservations(): Promise<number> {
    const result = await client.execute({
      sql: `UPDATE reservations
            SET released_at = CURRENT_TIMESTAMP, release_reason = 'expired'
            WHERE released_at IS NULL AND expires_at <= CURRENT_TIMESTAMP`,
      args: [],
    });

    return result.rowsAffected;
  }

  static async getExpiredItems(): Promise<any[]> {
    const result = await client.execute({
      sql: "SELECT * FROM expired_items",
      args: [],
    });

    return result.rows;
  }

  // =====================================================
  // TRANSACTION SUPPORT
  // =====================================================

  static async transaction<T>(callback: (trx: typeof DB) => Promise<T>): Promise<T> {
    // For now, use the same DB class - Turso handles transactions internally
    // In the future, could implement proper transaction context
    return callback(DB);
  }
}
