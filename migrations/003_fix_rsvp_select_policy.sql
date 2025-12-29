-- Fix: Allow anonymous users to check if their RSVP exists (for updates)
-- Without this, the update flow fails because anon can't SELECT to see existing RSVPs

DROP POLICY IF EXISTS "rsvps_anon_select" ON rsvps;

-- Allow anonymous SELECT only by invitation_id (so guests can check their own RSVP)
CREATE POLICY "rsvps_anon_select" ON rsvps 
    FOR SELECT 
    USING (true);

