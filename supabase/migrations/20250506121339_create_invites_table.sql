-- Create invites table
CREATE TABLE invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_code TEXT NOT NULL UNIQUE,
  inviter_signature TEXT NOT NULL,
  typed_data JSONB NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  used_by TEXT UNIQUE DEFAULT NULL
);

-- Create index for faster lookups
CREATE INDEX idx_invites_inviter_signature ON invites(inviter_signature);

-- Enable Row Level Security
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Only allow authenticated service role to access the table
CREATE POLICY "Service role only access" ON invites
  FOR ALL USING (auth.role() = 'service_role');
