import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

// Column names are snake_case in TypeScript too, so rows match the types in
// src/lib/database/types.ts without a mapping layer.
const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const invitations = pgTable(
  "invitations",
  {
    id: serial("id").primaryKey(),
    invite_code: text("invite_code").unique(), // NULL for direct onboarding
    flow_type: text("flow_type", { enum: ["invite", "direct"] }).notNull(),
    inviter_address: text("inviter_address").notNull(),
    recipient_address: text("recipient_address"), // NULL until reservation/completion
    signature: text("signature").notNull(),
    typed_data: jsonb("typed_data").notNull(),
    nonce: text("nonce").notNull(),
    created_at: timestamptz("created_at").notNull().defaultNow(),
    expires_at: timestamptz("expires_at").notNull(),
  },
  (t) => [
    // Replay protection (the unique constraint also serves as the lookup index)
    unique("invitations_inviter_nonce_unique").on(t.inviter_address, t.nonce),
    check("invitations_flow_type_check", sql`${t.flow_type} IN ('invite', 'direct')`),
    // Direct onboarding has no invite_code
    check(
      "invitations_invite_code_check",
      sql`(${t.flow_type} = 'invite' AND ${t.invite_code} IS NOT NULL) OR (${t.flow_type} = 'direct' AND ${t.invite_code} IS NULL)`
    ),
  ]
);

export const reservations = pgTable(
  "reservations",
  {
    id: serial("id").primaryKey(),
    invitation_id: integer("invitation_id")
      .notNull()
      .references(() => invitations.id),
    reservation_id: text("reservation_id").notNull().unique(),
    recipient_address: text("recipient_address").notNull(),
    reserved_at: timestamptz("reserved_at").notNull().defaultNow(),
    expires_at: timestamptz("expires_at").notNull(),
    released_at: timestamptz("released_at"),
    release_reason: text("release_reason", { enum: ["expired", "rollback", "completed"] }),
  },
  (t) => [
    check(
      "reservations_release_reason_check",
      sql`${t.release_reason} IN ('expired', 'rollback', 'completed')`
    ),
    check(
      "reservations_released_check",
      sql`(${t.released_at} IS NULL AND ${t.release_reason} IS NULL) OR (${t.released_at} IS NOT NULL AND ${t.release_reason} IS NOT NULL)`
    ),
  ]
);

export const completions = pgTable("completions", {
  id: serial("id").primaryKey(),
  invitation_id: integer("invitation_id")
    .notNull()
    .unique() // one completion per invitation
    .references(() => invitations.id),
  reservation_id: text("reservation_id").notNull(),
  recipient_address: text("recipient_address").notNull(),
  completed_at: timestamptz("completed_at").notNull().defaultNow(),
  mint_hat_tx_hash: text("mint_hat_tx_hash").notNull(),
  claim_signer_tx_hash: text("claim_signer_tx_hash").notNull(),
});

export const SECURITY_EVENT_TYPES = [
  "replay_attempt",
  "rate_limit_exceeded",
  "invalid_signature",
  "expired_signature",
  "expired_reservation",
  "recipient_mismatch",
] as const;

export const securityEvents = pgTable(
  "security_events",
  {
    id: serial("id").primaryKey(),
    event_type: text("event_type", { enum: SECURITY_EVENT_TYPES }).notNull(),
    inviter_address: text("inviter_address"),
    recipient_address: text("recipient_address"),
    signature: text("signature"),
    nonce: text("nonce"),
    ip_address: text("ip_address"),
    user_agent: text("user_agent"),
    timestamp: timestamptz("timestamp").notNull().defaultNow(),
    metadata: jsonb("metadata"),
  },
  (t) => [
    index("idx_security_events_timestamp").on(t.timestamp),
    check(
      "security_events_event_type_check",
      sql.raw(`event_type IN (${SECURITY_EVENT_TYPES.map((e) => `'${e}'`).join(", ")})`)
    ),
  ]
);

export const AUDIT_ACTIONS = [
  "create",
  "reserve",
  "release",
  "complete",
  "expire",
  "rollback",
] as const;

export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    entity_type: text("entity_type").notNull(),
    entity_id: integer("entity_id").notNull(),
    action: text("action", { enum: AUDIT_ACTIONS }).notNull(),
    actor_address: text("actor_address"),
    metadata: jsonb("metadata"),
    timestamp: timestamptz("timestamp").defaultNow(),
  },
  (t) => [
    check(
      "audit_log_action_check",
      sql.raw(`action IN (${AUDIT_ACTIONS.map((a) => `'${a}'`).join(", ")})`)
    ),
  ]
);
