-- Add message column to store the message signed by the user
ALTER TABLE invites
ADD COLUMN message TEXT;