CREATE TABLE IF NOT EXISTS invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invite_code TEXT UNIQUE, -- NULL for direct onboarding
    flow_type TEXT NOT NULL CHECK (flow_type IN ('invite', 'direct')),
    inviter_address TEXT NOT NULL,
    recipient_address TEXT, -- NULL until reservation/completion
    signature TEXT NOT NULL,
    typed_data JSON NOT NULL,
    nonce TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    
    -- Composite unique constraint for replay protection
    UNIQUE(inviter_address, nonce),
    
    -- Ensure direct onboarding has no invite_code
    CHECK (
        (flow_type = 'invite' AND invite_code IS NOT NULL) OR
        (flow_type = 'direct' AND invite_code IS NULL)
    )
);
CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invitation_id INTEGER NOT NULL,
    reservation_id TEXT NOT NULL UNIQUE,
    recipient_address TEXT NOT NULL,
    reserved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    released_at DATETIME NULL,
    release_reason TEXT CHECK (release_reason IN ('expired', 'rollback', 'completed')),
    
    FOREIGN KEY (invitation_id) REFERENCES invitations(id),
    
    -- Ensure only one active reservation per invitation
    CHECK (
        (released_at IS NULL AND release_reason IS NULL) OR
        (released_at IS NOT NULL AND release_reason IS NOT NULL)
    )
);
CREATE TABLE IF NOT EXISTS completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invitation_id INTEGER NOT NULL,
    reservation_id TEXT NOT NULL,
    recipient_address TEXT NOT NULL,
    completed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mint_hat_tx_hash TEXT NOT NULL,
    claim_signer_tx_hash TEXT NOT NULL,
    
    FOREIGN KEY (invitation_id) REFERENCES invitations(id),
    
    -- One completion per invitation
    UNIQUE(invitation_id)
);
CREATE TABLE IF NOT EXISTS security_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL CHECK (event_type IN ('replay_attempt', 'rate_limit_exceeded', 'invalid_signature', 'expired_signature', 'expired_reservation')),
    inviter_address TEXT,
    recipient_address TEXT,
    signature TEXT,
    nonce TEXT,
    ip_address TEXT,
    user_agent TEXT,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSON
);
CREATE TABLE IF NOT EXISTS "audit_log" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('create', 'reserve', 'release', 'complete', 'expire', 'rollback')),
  actor_address TEXT,
  metadata JSON,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_invitations_nonce_inviter ON invitations(inviter_address, nonce);
CREATE INDEX idx_security_events_timestamp ON security_events(timestamp);
CREATE VIEW invitation_status AS
SELECT 
    i.id,
    i.invite_code,
    i.flow_type,
    i.inviter_address,
    i.recipient_address,
    i.created_at,
    i.expires_at,
    CASE 
        WHEN c.id IS NOT NULL THEN 'completed'
        WHEN r.id IS NOT NULL AND r.released_at IS NULL AND r.expires_at > CURRENT_TIMESTAMP THEN 'reserved'
        WHEN r.id IS NOT NULL AND (r.released_at IS NOT NULL OR r.expires_at <= CURRENT_TIMESTAMP) THEN 'released'
        WHEN i.expires_at <= CURRENT_TIMESTAMP THEN 'expired'
        ELSE 'pending'
    END as status,
    r.reservation_id,
    r.reserved_at,
    r.expires_at as reservation_expires_at,
    r.release_reason,
    c.completed_at,
    c.mint_hat_tx_hash,
    c.claim_signer_tx_hash
FROM invitations i
LEFT JOIN reservations r ON i.id = r.invitation_id AND r.released_at IS NULL
LEFT JOIN completions c ON i.id = c.invitation_id;
CREATE VIEW security_dashboard AS
SELECT 
    inviter_address,
    flow_type,
    COUNT(*) as total_invitations,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_count,
    COUNT(CASE WHEN status = 'reserved' THEN 1 END) as reserved_count,
    MAX(created_at) as last_invitation_at,
    (SELECT COUNT(*) FROM security_events se WHERE se.inviter_address = i.inviter_address) as security_events_count
FROM invitation_status i
GROUP BY inviter_address, flow_type;
CREATE VIEW active_reservations AS
SELECT 
    r.*,
    i.inviter_address,
    i.invite_code,
    i.flow_type
FROM reservations r
JOIN invitations i ON r.invitation_id = i.id
WHERE r.released_at IS NULL;
CREATE VIEW expired_items AS
SELECT 
    'reservation' as item_type,
    r.id as item_id,
    r.invitation_id,
    i.inviter_address,
    r.expires_at
FROM reservations r
JOIN invitations i ON r.invitation_id = i.id
WHERE r.released_at IS NULL AND r.expires_at <= CURRENT_TIMESTAMP

UNION ALL

SELECT 
    'invitation' as item_type,
    i.id as item_id,
    i.id as invitation_id,
    i.inviter_address,
    i.expires_at
FROM invitations i
LEFT JOIN completions c ON i.id = c.invitation_id
WHERE c.id IS NULL AND i.expires_at <= CURRENT_TIMESTAMP;
