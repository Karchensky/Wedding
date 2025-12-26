-- RSVP Table for Wedding Website
-- Run this SQL in your Supabase SQL Editor

-- Create the RSVPs table
CREATE TABLE IF NOT EXISTS rsvps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    attending BOOLEAN NOT NULL,
    guest_count INTEGER DEFAULT 1,
    guest_names TEXT,
    dietary_restrictions TEXT,
    castle_stay BOOLEAN DEFAULT FALSE,
    message TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_rsvps_email ON rsvps(email);

-- Create index on submitted_at for sorting
CREATE INDEX IF NOT EXISTS idx_rsvps_submitted_at ON rsvps(submitted_at DESC);

-- Enable Row Level Security
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous inserts (for public RSVP submissions)
CREATE POLICY "Allow anonymous inserts" ON rsvps
    FOR INSERT
    WITH CHECK (true);

-- Create policy to allow authenticated reads (for you to view RSVPs)
CREATE POLICY "Allow authenticated reads" ON rsvps
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Optional: Create a view for easy RSVP summary
CREATE OR REPLACE VIEW rsvp_summary AS
SELECT 
    COUNT(*) FILTER (WHERE attending = true) as attending_count,
    COUNT(*) FILTER (WHERE attending = false) as declined_count,
    SUM(guest_count) FILTER (WHERE attending = true) as total_guests,
    COUNT(*) FILTER (WHERE attending = true AND castle_stay = true) as castle_stay_count,
    COUNT(*) as total_responses
FROM rsvps;

-- Grant access to the view
GRANT SELECT ON rsvp_summary TO authenticated;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rsvps_updated_at 
    BEFORE UPDATE ON rsvps 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

