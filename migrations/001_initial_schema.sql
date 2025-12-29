-- ============================================
-- Wedding Website Database Schema
-- Idempotent: Safe to run multiple times
-- ============================================

-- Helper function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- INVITATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    party_name TEXT NOT NULL,
    guest_names TEXT[] NOT NULL,
    party_size INTEGER NOT NULL,
    email TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_code ON invitations(code);
CREATE INDEX IF NOT EXISTS idx_invitations_party_name ON invitations(LOWER(party_name));

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts, then recreate
DROP POLICY IF EXISTS "invitations_anon_read" ON invitations;
DROP POLICY IF EXISTS "invitations_auth_insert" ON invitations;
DROP POLICY IF EXISTS "invitations_auth_update" ON invitations;
DROP POLICY IF EXISTS "invitations_auth_delete" ON invitations;
DROP POLICY IF EXISTS "Allow anonymous reads" ON invitations;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON invitations;
DROP POLICY IF EXISTS "Allow authenticated updates" ON invitations;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON invitations;

CREATE POLICY "invitations_anon_read" ON invitations FOR SELECT USING (true);
CREATE POLICY "invitations_auth_insert" ON invitations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "invitations_auth_update" ON invitations FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "invitations_auth_delete" ON invitations FOR DELETE USING (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS update_invitations_updated_at ON invitations;
CREATE TRIGGER update_invitations_updated_at 
    BEFORE UPDATE ON invitations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RSVPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS rsvps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
    guest_responses JSONB NOT NULL,
    dietary_restrictions TEXT,
    castle_preference TEXT CHECK (castle_preference IN ('yes', 'no')),
    email TEXT NOT NULL,
    message TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT rsvps_invitation_unique UNIQUE(invitation_id)
);

CREATE INDEX IF NOT EXISTS idx_rsvps_invitation_id ON rsvps(invitation_id);

ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rsvps_anon_insert" ON rsvps;
DROP POLICY IF EXISTS "rsvps_anon_update" ON rsvps;
DROP POLICY IF EXISTS "rsvps_anon_select" ON rsvps;
DROP POLICY IF EXISTS "rsvps_auth_read" ON rsvps;
DROP POLICY IF EXISTS "Allow anonymous inserts" ON rsvps;
DROP POLICY IF EXISTS "Allow anonymous updates" ON rsvps;
DROP POLICY IF EXISTS "Allow authenticated reads" ON rsvps;

CREATE POLICY "rsvps_anon_insert" ON rsvps FOR INSERT WITH CHECK (true);
CREATE POLICY "rsvps_anon_update" ON rsvps FOR UPDATE USING (true);
CREATE POLICY "rsvps_anon_select" ON rsvps FOR SELECT USING (true);

DROP TRIGGER IF EXISTS update_rsvps_updated_at ON rsvps;
CREATE TRIGGER update_rsvps_updated_at 
    BEFORE UPDATE ON rsvps 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SHARED PHOTOS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS shared_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    uploader_name TEXT NOT NULL,
    caption TEXT,
    approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_photos_created_at ON shared_photos(created_at DESC);

ALTER TABLE shared_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "photos_anon_insert" ON shared_photos;
DROP POLICY IF EXISTS "photos_anon_read" ON shared_photos;
DROP POLICY IF EXISTS "photos_auth_all" ON shared_photos;
DROP POLICY IF EXISTS "Allow anonymous photo inserts" ON shared_photos;
DROP POLICY IF EXISTS "Allow anonymous photo reads" ON shared_photos;
DROP POLICY IF EXISTS "Allow authenticated photo access" ON shared_photos;

CREATE POLICY "photos_anon_insert" ON shared_photos FOR INSERT WITH CHECK (true);
CREATE POLICY "photos_anon_read" ON shared_photos FOR SELECT USING (approved = true);
CREATE POLICY "photos_auth_all" ON shared_photos FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'wedding-photos',
    'wedding-photos',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies (drop if exist to avoid duplicates)
DROP POLICY IF EXISTS "storage_public_upload" ON storage.objects;
DROP POLICY IF EXISTS "storage_public_view" ON storage.objects;
DROP POLICY IF EXISTS "storage_auth_delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow public photo uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public photo viewing" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated photo deletes" ON storage.objects;

CREATE POLICY "storage_public_upload" ON storage.objects 
    FOR INSERT WITH CHECK (bucket_id = 'wedding-photos');
CREATE POLICY "storage_public_view" ON storage.objects 
    FOR SELECT USING (bucket_id = 'wedding-photos');
CREATE POLICY "storage_auth_delete" ON storage.objects 
    FOR DELETE USING (bucket_id = 'wedding-photos' AND auth.role() = 'authenticated');

-- ============================================
-- CLEANUP: Drop views (query tables directly in dashboard instead)
-- ============================================
DROP VIEW IF EXISTS rsvp_summary;
DROP VIEW IF EXISTS rsvp_totals;

-- ============================================
-- DONE
-- ============================================

