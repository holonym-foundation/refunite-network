PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invite_code TEXT NOT NULL UNIQUE,
  inviter_signature TEXT NOT NULL,
  typed_data JSON NOT NULL,
  used_at DATETIME DEFAULT NULL,
  used_by DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
DELETE FROM sqlite_sequence;
CREATE INDEX idx_invites_inviter_signature ON invites (inviter_signature);
COMMIT;
