CREATE TABLE "leader_action_nonces" (
	"id" serial PRIMARY KEY NOT NULL,
	"leader_address" text NOT NULL,
	"nonce" text NOT NULL,
	"action" text NOT NULL,
	"used_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leader_action_nonces_leader_nonce_unique" UNIQUE("leader_address","nonce")
);
--> statement-breakpoint
ALTER TABLE "security_events" DROP CONSTRAINT "security_events_event_type_check";--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_event_type_check" CHECK (event_type IN ('replay_attempt', 'rate_limit_exceeded', 'invalid_signature', 'expired_signature', 'expired_reservation', 'recipient_mismatch', 'not_leader'));