-- Invitations Table for Personalized RSVP System
-- Run this SQL in your Supabase SQL Editor

-- Create the invitations table
CREATE TABLE IF NOT EXISTS invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    party_name TEXT NOT NULL,
    guest_names TEXT[] NOT NULL,
    party_size INTEGER NOT NULL,
    email TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on code for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_code ON invitations(code);

-- Create index on party_name for name searches (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_invitations_party_name ON invitations(LOWER(party_name));

-- Enable Row Level Security
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Allow anonymous reads (guests need to look up their invitation)
CREATE POLICY "Allow anonymous reads" ON invitations
    FOR SELECT
    USING (true);

-- Only authenticated users can insert/update/delete (you managing the guest list)
CREATE POLICY "Allow authenticated inserts" ON invitations
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated updates" ON invitations
    FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated deletes" ON invitations
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- Updated RSVPs table to link to invitations
-- First, drop the old table if you want a fresh start, or alter it

-- Option A: Create new RSVP structure (recommended for fresh start)
DROP TABLE IF EXISTS rsvps CASCADE;

CREATE TABLE rsvps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
    guest_responses JSONB NOT NULL,
    -- Format: [{"name": "John Smith", "attending": true}, {"name": "Jane Smith", "attending": false}]
    dietary_restrictions TEXT,
    castle_preference TEXT CHECK (castle_preference IN ('yes', 'no')),
    email TEXT NOT NULL,
    message TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(invitation_id)  -- One RSVP per invitation
);

-- Create index on invitation_id
CREATE INDEX IF NOT EXISTS idx_rsvps_invitation_id ON rsvps(invitation_id);

-- Enable Row Level Security
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (guests submitting RSVPs)
CREATE POLICY "Allow anonymous inserts" ON rsvps
    FOR INSERT
    WITH CHECK (true);

-- Allow anonymous updates (guests can update their RSVP)
CREATE POLICY "Allow anonymous updates" ON rsvps
    FOR UPDATE
    USING (true);

-- Allow authenticated reads (you viewing RSVPs)
CREATE POLICY "Allow authenticated reads" ON rsvps
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Updated RSVP summary view
CREATE OR REPLACE VIEW rsvp_summary AS
SELECT 
    i.id as invitation_id,
    i.code,
    i.party_name,
    i.party_size,
    r.id as rsvp_id,
    r.guest_responses,
    r.dietary_restrictions,
    r.castle_preference,
    r.email,
    r.message,
    r.submitted_at,
    (SELECT COUNT(*) FROM jsonb_array_elements(r.guest_responses) elem WHERE elem->>'attending' = 'true') as guests_attending,
    (SELECT COUNT(*) FROM jsonb_array_elements(r.guest_responses) elem WHERE elem->>'attending' = 'false') as guests_declined
FROM invitations i
LEFT JOIN rsvps r ON r.invitation_id = i.id;

-- Aggregate summary
CREATE OR REPLACE VIEW rsvp_totals AS
SELECT 
    COUNT(DISTINCT i.id) as total_invitations,
    COUNT(DISTINCT r.id) as total_responses,
    COUNT(DISTINCT i.id) - COUNT(DISTINCT r.id) as pending_responses,
    SUM(i.party_size) as total_invited_guests,
    (SELECT SUM((SELECT COUNT(*) FROM jsonb_array_elements(r2.guest_responses) elem WHERE elem->>'attending' = 'true')) 
     FROM rsvps r2) as confirmed_attending,
    (SELECT SUM((SELECT COUNT(*) FROM jsonb_array_elements(r2.guest_responses) elem WHERE elem->>'attending' = 'false')) 
     FROM rsvps r2) as confirmed_declined,
    COUNT(DISTINCT r.id) FILTER (WHERE r.castle_preference = 'yes') as prefer_castle,
    COUNT(DISTINCT r.id) FILTER (WHERE r.castle_preference = 'no') as prefer_offsite
FROM invitations i
LEFT JOIN rsvps r ON r.invitation_id = i.id;

-- Grant access to views
GRANT SELECT ON rsvp_summary TO authenticated;
GRANT SELECT ON rsvp_totals TO authenticated;

-- Add updated_at trigger for invitations
CREATE TRIGGER update_invitations_updated_at 
    BEFORE UPDATE ON invitations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for rsvps
DROP TRIGGER IF EXISTS update_rsvps_updated_at ON rsvps;
CREATE TRIGGER update_rsvps_updated_at 
    BEFORE UPDATE ON rsvps 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA: Remove before production!
-- ============================================

-- Insert some sample invitations for testing
INSERT INTO invitations (code, party_name, guest_names, party_size, email) VALUES
    ('SMITH01', 'The Smith Family', ARRAY['John Smith', 'Jane Smith', 'Tommy Smith', 'Sarah Smith'], 4, 'john.smith@email.com'),
    ('JONES02', 'Michael & Lisa Jones', ARRAY['Michael Jones', 'Lisa Jones'], 2, 'mjones@email.com'),
    ('BROWN03', 'David Brown', ARRAY['David Brown'], 1, 'dbrown@email.com'),
    ('WILSON4', 'The Wilson Family', ARRAY['Robert Wilson', 'Emily Wilson', 'Jack Wilson'], 3, 'rwilson@email.com'),
    ('TAYLOR5', 'Sarah Taylor & Guest', ARRAY['Sarah Taylor', 'Guest'], 2, 'staylor@email.com')
ON CONFLICT (code) DO NOTHING;

-- Note: Delete this sample data before sending real invitations!
-- DELETE FROM invitations WHERE code IN ('SMITH01', 'JONES02', 'BROWN03', 'WILSON4', 'TAYLOR5');

