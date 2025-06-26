-- Remove uniqueness constraint from used_by column in invites table
-- This allows the same address to accept multiple invites

ALTER TABLE invites DROP CONSTRAINT IF EXISTS invites_used_by_key;