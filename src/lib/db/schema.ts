import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uuid,
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
  mint_hat_tx_hash: text("mint_hat_tx_hash"), // null when the hat was already worn (resumed)
  claim_signer_tx_hash: text("claim_signer_tx_hash").notNull(),
});

export const SECURITY_EVENT_TYPES = [
  "replay_attempt",
  "rate_limit_exceeded",
  "invalid_signature",
  "expired_signature",
  "expired_reservation",
  "recipient_mismatch",
  "not_leader",
  "not_beneficiary",
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

// Every state-changing signed action (see src/lib/signed-actions) consumes its nonce here,
// so a signature can be used only once. `leader_address` holds the signer, which is a
// beneficiary for beneficiary actions (the name predates those).
export const leaderActionNonces = pgTable(
  "leader_action_nonces",
  {
    id: serial("id").primaryKey(),
    leader_address: text("leader_address").notNull(),
    nonce: text("nonce").notNull(),
    action: text("action").notNull(),
    used_at: timestamptz("used_at").notNull().defaultNow(),
  },
  (t) => [unique("leader_action_nonces_leader_nonce_unique").on(t.leader_address, t.nonce)]
);

// People a leader registers to receive Stellar disbursements. A beneficiary belongs to the
// leader who added them (added_by); only that leader can see them or disburse to them.
export const beneficiaries = pgTable(
  "beneficiaries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eth_address: text("eth_address").notNull().unique(), // checksummed; their WaaP login
    stellar_address: text("stellar_address").notNull(), // derived smart-wallet contract id
    added_by: text("added_by").notNull(), // checksummed leader address
    created_at: timestamptz("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_beneficiaries_added_by").on(t.added_by),
    check("beneficiaries_not_self_check", sql`${t.eth_address} <> ${t.added_by}`),
  ]
);

const xlm = (name: string) => numeric(name, { precision: 20, scale: 7 }); // exact, 7 decimals

export const DISBURSEMENT_STATUSES = [
  "pending", // created by the leader; waiting for the beneficiary to redeem
  "redeeming", // claimed by a redeem request; the payment is in progress
  "redeemed", // paid; tx_hash is set
  "needs_review", // payment was submitted but its outcome is unknown; never retried automatically
] as const;

// A leader's promise of XLM to one of their beneficiaries, redeemed by the beneficiary.
export const disbursements = pgTable(
  "disbursements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    beneficiary_id: uuid("beneficiary_id")
      .notNull()
      .references(() => beneficiaries.id),
    leader_address: text("leader_address").notNull(),
    amount: xlm("amount").notNull(),
    status: text("status", { enum: DISBURSEMENT_STATUSES }).notNull().default("pending"),
    tx_hash: text("tx_hash").unique(),
    last_error: text("last_error"),
    created_at: timestamptz("created_at").notNull().defaultNow(),
    redeemed_at: timestamptz("redeemed_at"),
  },
  (t) => [
    index("idx_disbursements_leader_created").on(t.leader_address, t.created_at),
    index("idx_disbursements_beneficiary").on(t.beneficiary_id),
    check("disbursements_amount_positive_check", sql`${t.amount} > 0`),
    check(
      "disbursements_status_check",
      sql.raw(`status IN (${DISBURSEMENT_STATUSES.map((s) => `'${s}'`).join(", ")})`)
    ),
    // redeemed ⇒ paid (hash + time); only redeemed has redeemed_at. tx_hash may also be
    // set on needs_review, to look the submitted payment up.
    check(
      "disbursements_redeemed_check",
      sql`(${t.status} <> 'redeemed' OR (${t.tx_hash} IS NOT NULL AND ${t.redeemed_at} IS NOT NULL)) AND (${t.redeemed_at} IS NULL OR ${t.status} = 'redeemed')`
    ),
  ]
);

// Admin top-ups of a leader's allowance, on top of the starting allowance. A leader's
// balance = starting allowance + credits - everything they have disbursed.
export const leaderAllowanceCredits = pgTable(
  "leader_allowance_credits",
  {
    id: serial("id").primaryKey(),
    leader_address: text("leader_address").notNull(),
    amount: xlm("amount").notNull(),
    note: text("note"),
    created_at: timestamptz("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_leader_allowance_credits_leader").on(t.leader_address),
    check("leader_allowance_credits_amount_positive_check", sql`${t.amount} > 0`),
  ]
);
