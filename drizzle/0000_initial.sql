CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"action" text NOT NULL,
	"actor_address" text,
	"metadata" jsonb,
	"timestamp" timestamp with time zone DEFAULT now(),
	CONSTRAINT "audit_log_action_check" CHECK (action IN ('create', 'reserve', 'release', 'complete', 'expire', 'rollback'))
);
--> statement-breakpoint
CREATE TABLE "completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"invitation_id" integer NOT NULL,
	"reservation_id" text NOT NULL,
	"recipient_address" text NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"mint_hat_tx_hash" text NOT NULL,
	"claim_signer_tx_hash" text NOT NULL,
	CONSTRAINT "completions_invitation_id_unique" UNIQUE("invitation_id")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"invite_code" text,
	"flow_type" text NOT NULL,
	"inviter_address" text NOT NULL,
	"recipient_address" text,
	"signature" text NOT NULL,
	"typed_data" jsonb NOT NULL,
	"nonce" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "invitations_invite_code_unique" UNIQUE("invite_code"),
	CONSTRAINT "invitations_inviter_nonce_unique" UNIQUE("inviter_address","nonce"),
	CONSTRAINT "invitations_flow_type_check" CHECK ("invitations"."flow_type" IN ('invite', 'direct')),
	CONSTRAINT "invitations_invite_code_check" CHECK (("invitations"."flow_type" = 'invite' AND "invitations"."invite_code" IS NOT NULL) OR ("invitations"."flow_type" = 'direct' AND "invitations"."invite_code" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"invitation_id" integer NOT NULL,
	"reservation_id" text NOT NULL,
	"recipient_address" text NOT NULL,
	"reserved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"released_at" timestamp with time zone,
	"release_reason" text,
	CONSTRAINT "reservations_reservation_id_unique" UNIQUE("reservation_id"),
	CONSTRAINT "reservations_release_reason_check" CHECK ("reservations"."release_reason" IN ('expired', 'rollback', 'completed')),
	CONSTRAINT "reservations_released_check" CHECK (("reservations"."released_at" IS NULL AND "reservations"."release_reason" IS NULL) OR ("reservations"."released_at" IS NOT NULL AND "reservations"."release_reason" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"inviter_address" text,
	"recipient_address" text,
	"signature" text,
	"nonce" text,
	"ip_address" text,
	"user_agent" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb,
	CONSTRAINT "security_events_event_type_check" CHECK (event_type IN ('replay_attempt', 'rate_limit_exceeded', 'invalid_signature', 'expired_signature', 'expired_reservation', 'recipient_mismatch'))
);
--> statement-breakpoint
ALTER TABLE "completions" ADD CONSTRAINT "completions_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_security_events_timestamp" ON "security_events" USING btree ("timestamp");