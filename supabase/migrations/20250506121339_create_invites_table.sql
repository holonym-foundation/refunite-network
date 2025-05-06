-- Create invites table
CREATE TABLE invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_address TEXT NOT NULL,
  signature_nonce TEXT NOT NULL UNIQUE,
  inviter_signature TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by TEXT UNIQUE,
  CONSTRAINT valid_address CHECK (inviter_address ~ '^0x[a-fA-F0-9]{40}$'),
  CONSTRAINT valid_used_by CHECK (used_by ~ '^0x[a-fA-F0-9]{40}$' OR used_by IS NULL),
  CONSTRAINT valid_signature CHECK (inviter_signature ~ '^0x[a-fA-F0-9]{130}$'),
  CONSTRAINT valid_invite_code CHECK (invite_code ~ '^[0-9a-zA-Z]{8}$')
);

-- Create indexes for faster lookups
CREATE INDEX idx_invites_signature_nonce ON invites(signature_nonce);
CREATE INDEX idx_invites_inviter_address ON invites(inviter_address);
CREATE INDEX idx_invites_expires_at ON invites(expires_at);
CREATE INDEX idx_invites_used_at ON invites(used_at);
CREATE INDEX idx_invites_invite_code ON invites(invite_code);

-- Enable Row Level Security
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Only allow authenticated service role to access the table
CREATE POLICY "Service role only access" ON invites
  FOR ALL USING (auth.role() = 'service_role');
