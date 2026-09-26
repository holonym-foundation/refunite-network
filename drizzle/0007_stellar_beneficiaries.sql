-- Beneficiaries are now Stellar accounts, not EVM addresses with a derived smart wallet.
-- Existing rows are staging test data keyed by EVM address: remove them (disbursements first).
DELETE FROM "disbursements";--> statement-breakpoint
DELETE FROM "beneficiaries";--> statement-breakpoint
ALTER TABLE "beneficiaries" DROP CONSTRAINT "beneficiaries_eth_address_unique";--> statement-breakpoint
ALTER TABLE "beneficiaries" DROP CONSTRAINT "beneficiaries_not_self_check";--> statement-breakpoint
ALTER TABLE "beneficiaries" DROP COLUMN "eth_address";--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_stellar_address_unique" UNIQUE("stellar_address");--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_stellar_account_check" CHECK ("beneficiaries"."stellar_address" ~ '^G[A-Z2-7]{55}$');