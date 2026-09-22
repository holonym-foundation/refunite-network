import { db } from "@/lib/db";
import {
  auditLog,
  beneficiaries,
  completions,
  invitations,
  leaderActionNonces,
  reservations,
  securityEvents,
} from "@/lib/db/schema";
import { marshalTypedData } from "@/lib/utils/serialize";
import { and, count, desc, eq, isNotNull, isNull, lte, sql } from "drizzle-orm";
import {
  AuditLogEntry,
  AuditLogMetadata,
  Beneficiary,
  Completion,
  CreateCompletionData,
  CreateInvitationData,
  CreateReservationData,
  DeviceInfo,
  FindInvitationWhere,
  Invitation,
  InvitationStatus,
  Reservation,
  SecurityEvent,
} from "./types";

/**
 * Rows keep the shape of the original SQLite API: dates as ISO strings.
 * Callers only ever parse them with `new Date(...)`.
 */
type WithIsoDates<T> = {
  [K in keyof T]: T[K] extends Date ? string : T[K] extends Date | null ? string | null : T[K];
};

function withIsoDates<T extends Record<string, unknown>>(row: T): WithIsoDates<T> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      value instanceof Date ? value.toISOString() : value,
    ])
  ) as WithIsoDates<T>;
}

export class DB {
  // =====================================================
  // INVITATIONS
  // =====================================================

  static async createInvitation(data: CreateInvitationData): Promise<Invitation> {
    const [row] = await db
      .insert(invitations)
      .values({
        invite_code: data.invite_code,
        flow_type: data.flow_type,
        inviter_address: data.inviter_address,
        recipient_address: data.recipient_address,
        signature: data.signature,
        typed_data: marshalTypedData(data.typed_data),
        nonce: data.nonce,
        expires_at: new Date(data.expires_at),
      })
      .returning();

    return withIsoDates(row) as Invitation;
  }

  static async findInvitation(where: FindInvitationWhere): Promise<Invitation | null> {
    let condition;
    if (where.id) {
      condition = eq(invitations.id, where.id);
    } else if (where.invite_code) {
      condition = eq(invitations.invite_code, where.invite_code);
    } else if (where.inviter_address_and_nonce) {
      condition = and(
        eq(invitations.inviter_address, where.inviter_address_and_nonce.inviter_address),
        eq(invitations.nonce, where.inviter_address_and_nonce.nonce)
      );
    } else {
      throw new Error("Invalid where clause for findInvitation");
    }

    const [row] = await db.select().from(invitations).where(condition).limit(1);
    return row ? (withIsoDates(row) as Invitation) : null;
  }

  static async getInvitationStatus(invitationId: number): Promise<InvitationStatus | null> {
    // Replaces the SQLite `invitation_status` view
    const [row] = await db
      .select({
        id: invitations.id,
        invite_code: invitations.invite_code,
        flow_type: invitations.flow_type,
        inviter_address: invitations.inviter_address,
        recipient_address: invitations.recipient_address,
        created_at: invitations.created_at,
        expires_at: invitations.expires_at,
        status: sql<InvitationStatus["status"]>`CASE
          WHEN ${completions.id} IS NOT NULL THEN 'completed'
          WHEN ${reservations.id} IS NOT NULL AND ${reservations.expires_at} > now() THEN 'reserved'
          WHEN ${reservations.id} IS NOT NULL THEN 'released'
          WHEN ${invitations.expires_at} <= now() THEN 'expired'
          ELSE 'pending'
        END`,
        reservation_id: reservations.reservation_id,
        reserved_at: reservations.reserved_at,
        reservation_expires_at: reservations.expires_at,
        release_reason: reservations.release_reason,
        completed_at: completions.completed_at,
        mint_hat_tx_hash: completions.mint_hat_tx_hash,
        claim_signer_tx_hash: completions.claim_signer_tx_hash,
      })
      .from(invitations)
      .leftJoin(
        reservations,
        and(eq(reservations.invitation_id, invitations.id), isNull(reservations.released_at))
      )
      .leftJoin(completions, eq(completions.invitation_id, invitations.id))
      .where(eq(invitations.id, invitationId))
      .limit(1);

    return row ? (withIsoDates(row) as InvitationStatus) : null;
  }

  // =====================================================
  // RESERVATIONS
  // =====================================================

  static async createReservation(data: CreateReservationData): Promise<Reservation> {
    const [row] = await db
      .insert(reservations)
      .values({
        invitation_id: data.invitation_id,
        reservation_id: data.reservation_id,
        recipient_address: data.recipient_address,
        expires_at: new Date(data.expires_at),
      })
      .returning();

    return withIsoDates(row) as Reservation;
  }

  static async findActiveReservation(reservationId: string): Promise<Reservation | null> {
    const [row] = await db
      .select()
      .from(reservations)
      .where(and(eq(reservations.reservation_id, reservationId), isNull(reservations.released_at)))
      .limit(1);

    return row ? (withIsoDates(row) as Reservation) : null;
  }

  static async releaseReservation(reservationId: string, reason: string): Promise<void> {
    await db
      .update(reservations)
      .set({
        released_at: sql`now()`,
        release_reason: reason as "expired" | "rollback" | "completed",
      })
      .where(eq(reservations.reservation_id, reservationId));
  }

  // =====================================================
  // COMPLETIONS
  // =====================================================

  static async createCompletion(data: CreateCompletionData): Promise<Completion> {
    const [row] = await db
      .insert(completions)
      .values({
        invitation_id: data.invitation_id,
        reservation_id: data.reservation_id,
        recipient_address: data.recipient_address,
        mint_hat_tx_hash: data.mint_hat_tx_hash,
        claim_signer_tx_hash: data.claim_signer_tx_hash,
      })
      .returning();

    return withIsoDates(row) as Completion;
  }

  static async isAddressOnboarded(address: string): Promise<boolean> {
    const rows = await db
      .select({ id: completions.id })
      .from(completions)
      .where(sql`lower(${completions.recipient_address}) = lower(${address})`)
      .limit(1);
    return rows.length > 0;
  }

  // =====================================================
  // SECURITY EVENTS
  // =====================================================

  static async logSecurityEvent(event: SecurityEvent): Promise<void> {
    await db.insert(securityEvents).values({
      event_type: event.event_type,
      inviter_address: event.inviter_address,
      recipient_address: event.recipient_address,
      signature: event.signature,
      nonce: event.nonce,
      ip_address: event.ip_address,
      user_agent: event.user_agent,
      metadata: event.metadata,
    });
  }

  static async logSecurityEventWithDeviceInfo(
    event: SecurityEvent,
    deviceInfo?: Partial<DeviceInfo>
  ): Promise<void> {
    const enhancedMetadata: AuditLogMetadata = {
      ...event.metadata,
      deviceInfo,
    };

    await this.logSecurityEvent({ ...event, metadata: enhancedMetadata });
  }

  // =====================================================
  // LEADER ACTION NONCES
  // =====================================================

  /**
   * Records a leader action's nonce. Returns false if that leader already used it
   * (a replay); the unique constraint makes concurrent attempts safe.
   */
  static async consumeLeaderActionNonce(
    leaderAddress: string,
    nonce: string,
    action: string
  ): Promise<boolean> {
    const inserted = await db
      .insert(leaderActionNonces)
      .values({ leader_address: leaderAddress, nonce, action })
      .onConflictDoNothing()
      .returning({ id: leaderActionNonces.id });
    return inserted.length > 0;
  }

  // =====================================================
  // BENEFICIARIES
  // =====================================================

  /** Returns null if the Ethereum address is already a beneficiary (of any leader). */
  static async createBeneficiary(
    data: Pick<Beneficiary, "eth_address" | "stellar_address" | "added_by">
  ): Promise<Beneficiary | null> {
    const [row] = await db.insert(beneficiaries).values(data).onConflictDoNothing().returning();
    return row ? withIsoDates(row) : null;
  }

  static async findBeneficiaryByEthAddress(ethAddress: string): Promise<Beneficiary | null> {
    const [row] = await db
      .select()
      .from(beneficiaries)
      .where(eq(beneficiaries.eth_address, ethAddress))
      .limit(1);
    return row ? withIsoDates(row) : null;
  }

  static async listBeneficiariesByLeader(leaderAddress: string): Promise<Beneficiary[]> {
    const rows = await db
      .select()
      .from(beneficiaries)
      .where(eq(beneficiaries.added_by, leaderAddress))
      .orderBy(desc(beneficiaries.created_at), beneficiaries.eth_address); // stable for ties
    return rows.map(withIsoDates);
  }

  // =====================================================
  // AUDIT LOGGING
  // =====================================================

  static async logAudit(entry: AuditLogEntry): Promise<void> {
    await db.insert(auditLog).values({
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      action: entry.action,
      actor_address: entry.actor_address,
      metadata: entry.metadata,
    });
  }

  /**
   * Log audit entry with device information automatically included
   */
  static async logAuditWithDeviceInfo(
    entry: AuditLogEntry,
    deviceInfo?: Partial<DeviceInfo>
  ): Promise<void> {
    const enhancedMetadata: AuditLogMetadata = {
      ...entry.metadata,
      deviceInfo,
    };

    await this.logAudit({ ...entry, metadata: enhancedMetadata });
  }

  // =====================================================
  // CLEANUP OPERATIONS
  // =====================================================

  static async cleanupExpiredReservations(): Promise<number> {
    const released = await db
      .update(reservations)
      .set({ released_at: sql`now()`, release_reason: "expired" })
      .where(and(isNull(reservations.released_at), lte(reservations.expires_at, sql`now()`)))
      .returning({ id: reservations.id });

    return released.length;
  }

  static async getExpiredItems(): Promise<Record<string, unknown>[]> {
    // Replaces the SQLite `expired_items` view
    const expiredReservations = await db
      .select({
        item_type: sql<string>`'reservation'`,
        item_id: reservations.id,
        invitation_id: reservations.invitation_id,
        inviter_address: invitations.inviter_address,
        expires_at: reservations.expires_at,
      })
      .from(reservations)
      .innerJoin(invitations, eq(reservations.invitation_id, invitations.id))
      .where(and(isNull(reservations.released_at), lte(reservations.expires_at, sql`now()`)));

    const expiredInvitations = await db
      .select({
        item_type: sql<string>`'invitation'`,
        item_id: invitations.id,
        invitation_id: invitations.id,
        inviter_address: invitations.inviter_address,
        expires_at: invitations.expires_at,
      })
      .from(invitations)
      .leftJoin(completions, eq(completions.invitation_id, invitations.id))
      .where(and(isNull(completions.id), lte(invitations.expires_at, sql`now()`)));

    return [...expiredReservations, ...expiredInvitations].map(withIsoDates);
  }

  // =====================================================
  // DASHBOARD METRICS
  // =====================================================

  /**
   * Count of successful onboardings (completions)
   */
  static async countCompletions(): Promise<number> {
    const [row] = await db
      .select({ count: count() })
      .from(invitations)
      .where(isNotNull(invitations.recipient_address));
    return Number(row?.count ?? 0);
  }

  /**
   * Count of reserved invites (active reservations)
   */
  static async countReservedInvites(): Promise<number> {
    const [row] = await db
      .select({ count: count() })
      .from(reservations)
      .where(isNull(reservations.released_at));
    return Number(row?.count ?? 0);
  }

  /**
   * Count of total invites
   */
  static async countInvitations(): Promise<number> {
    const [row] = await db.select({ count: count() }).from(invitations);
    return Number(row?.count ?? 0);
  }

  // =====================================================
  // TRANSACTION SUPPORT
  // =====================================================

  static async transaction<T>(callback: (trx: typeof DB) => Promise<T>): Promise<T> {
    // Neon's HTTP driver has no interactive transactions; callers run sequentially
    return callback(DB);
  }
}
