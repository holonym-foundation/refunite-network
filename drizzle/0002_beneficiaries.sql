CREATE TABLE "beneficiaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"eth_address" text NOT NULL,
	"stellar_address" text NOT NULL,
	"added_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beneficiaries_eth_address_unique" UNIQUE("eth_address"),
	CONSTRAINT "beneficiaries_not_self_check" CHECK ("beneficiaries"."eth_address" <> "beneficiaries"."added_by")
);
--> statement-breakpoint
CREATE INDEX "idx_beneficiaries_added_by" ON "beneficiaries" USING btree ("added_by");