-- Shared Photos Table for Guest Photo Uploads
-- Run this SQL in your Supabase SQL Editor

-- Create the shared_photos table
CREATE TABLE IF NOT EXISTS shared_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    uploader_name TEXT NOT NULL,
    caption TEXT,
    approved BOOLEAN DEFAULT TRUE,  -- Set to FALSE if you want to moderate
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for sorting by date
CREATE INDEX IF NOT EXISTS idx_shared_photos_created_at ON shared_photos(created_at DESC);

-- Enable Row Level Security
ALTER TABLE shared_photos ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (guests uploading photos)
CREATE POLICY "Allow anonymous inserts" ON shared_photos
    FOR INSERT
    WITH CHECK (true);

-- Allow anonymous reads for approved photos
CREATE POLICY "Allow anonymous reads" ON shared_photos
    FOR SELECT
    USING (approved = true);

-- Allow authenticated users full access (for moderation)
CREATE POLICY "Allow authenticated full access" ON shared_photos
    FOR ALL
    USING (auth.role() = 'authenticated');

-- ============================================
-- STORAGE BUCKET SETUP
-- ============================================
-- Run these commands separately in the Supabase Dashboard
-- Go to: Storage > New Bucket

-- 1. Create a bucket called "wedding-photos"
-- 2. Make it PUBLIC (so photos can be viewed without auth)
-- 3. Set file size limit to 10MB
-- 4. Allow mime types: image/jpeg, image/png, image/webp, image/heic

-- Or run this SQL:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'wedding-photos',
    'wedding-photos',
    true,
    10485760,  -- 10MB in bytes
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the bucket
-- Allow anyone to upload
CREATE POLICY "Allow public uploads" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'wedding-photos');

-- Allow anyone to view
CREATE POLICY "Allow public viewing" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'wedding-photos');

-- Allow authenticated users to delete (for moderation)
CREATE POLICY "Allow authenticated deletes" ON storage.objects
    FOR DELETE
    USING (bucket_id = 'wedding-photos' AND auth.role() = 'authenticated');

-- ============================================
-- USEFUL VIEWS
-- ============================================

-- View for photo statistics
CREATE OR REPLACE VIEW photo_stats AS
SELECT 
    COUNT(*) as total_photos,
    COUNT(DISTINCT uploader_name) as unique_uploaders,
    COUNT(*) FILTER (WHERE approved = true) as approved_photos,
    COUNT(*) FILTER (WHERE approved = false) as pending_photos
FROM shared_photos;

GRANT SELECT ON photo_stats TO authenticated;

-- ============================================
-- OPTIONAL: Moderation helpers
-- ============================================

-- Function to approve a photo
CREATE OR REPLACE FUNCTION approve_photo(photo_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE shared_photos SET approved = true WHERE id = photo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject/delete a photo
CREATE OR REPLACE FUNCTION reject_photo(photo_id UUID)
RETURNS void AS $$
DECLARE
    photo_path TEXT;
BEGIN
    -- Get the file path
    SELECT file_path INTO photo_path FROM shared_photos WHERE id = photo_id;
    
    -- Delete from storage (you may need to do this manually or via admin API)
    -- DELETE FROM storage.objects WHERE name = photo_path AND bucket_id = 'wedding-photos';
    
    -- Delete from database
    DELETE FROM shared_photos WHERE id = photo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

