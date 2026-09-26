ALTER TABLE "disbursements" DROP CONSTRAINT "disbursements_status_check";--> statement-breakpoint
ALTER TABLE "disbursements" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_disbursements_status_updated" ON "disbursements" USING btree ("status","updated_at");--> statement-breakpoint
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_status_check" CHECK (status IN ('pending', 'redeeming', 'redeemed', 'needs_review', 'cancelled'));