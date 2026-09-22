CREATE TABLE "disbursements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"beneficiary_id" uuid NOT NULL,
	"leader_address" text NOT NULL,
	"amount" numeric(20, 7) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"tx_hash" text,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"redeemed_at" timestamp with time zone,
	CONSTRAINT "disbursements_tx_hash_unique" UNIQUE("tx_hash"),
	CONSTRAINT "disbursements_amount_positive_check" CHECK ("disbursements"."amount" > 0),
	CONSTRAINT "disbursements_status_check" CHECK (status IN ('pending', 'redeeming', 'redeemed', 'needs_review')),
	CONSTRAINT "disbursements_redeemed_check" CHECK (("disbursements"."status" <> 'redeemed' OR ("disbursements"."tx_hash" IS NOT NULL AND "disbursements"."redeemed_at" IS NOT NULL)) AND ("disbursements"."redeemed_at" IS NULL OR "disbursements"."status" = 'redeemed'))
);
--> statement-breakpoint
CREATE TABLE "leader_allowance_credits" (
	"id" serial PRIMARY KEY NOT NULL,
	"leader_address" text NOT NULL,
	"amount" numeric(20, 7) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leader_allowance_credits_amount_positive_check" CHECK ("leader_allowance_credits"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_beneficiary_id_beneficiaries_id_fk" FOREIGN KEY ("beneficiary_id") REFERENCES "public"."beneficiaries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_disbursements_leader_created" ON "disbursements" USING btree ("leader_address","created_at");--> statement-breakpoint
CREATE INDEX "idx_disbursements_beneficiary" ON "disbursements" USING btree ("beneficiary_id");--> statement-breakpoint
CREATE INDEX "idx_leader_allowance_credits_leader" ON "leader_allowance_credits" USING btree ("leader_address");