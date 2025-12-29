-- ============================================
-- Security Improvements Migration
-- Idempotent: Safe to run multiple times
-- ============================================

-- ============================================
-- 1. Make email optional in RSVPs table
-- ============================================
ALTER TABLE rsvps ALTER COLUMN email DROP NOT NULL;

-- ============================================
-- 2. Fix search_path security warning on functions
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ============================================
-- 3. Create secure lookup function for invitations
--    This prevents users from listing ALL invitations
--    They can only look up by code (which they receive privately)
-- ============================================
CREATE OR REPLACE FUNCTION lookup_invitation(lookup_code TEXT)
RETURNS TABLE (
    id UUID,
    party_name TEXT,
    guest_names TEXT[],
    party_size INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY 
    SELECT i.id, i.party_name, i.guest_names, i.party_size
    FROM public.invitations i 
    WHERE UPPER(i.code) = UPPER(lookup_code);
END;
$$;

-- ============================================
-- 4. Create secure lookup for existing RSVP
--    Allows checking if an RSVP exists for a given invitation
-- ============================================
CREATE OR REPLACE FUNCTION get_rsvp_by_invitation(inv_id UUID)
RETURNS TABLE (
    id UUID,
    invitation_id UUID,
    guest_responses JSONB,
    dietary_restrictions TEXT,
    castle_preference TEXT,
    message TEXT,
    submitted_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY 
    SELECT r.id, r.invitation_id, r.guest_responses, r.dietary_restrictions, 
           r.castle_preference, r.message, r.submitted_at
    FROM public.rsvps r 
    WHERE r.invitation_id = inv_id;
END;
$$;

-- ============================================
-- 5. Restrict direct table access for invitations
--    Remove anon read access - force use of RPC function
-- ============================================
DROP POLICY IF EXISTS "invitations_anon_read" ON invitations;
DROP POLICY IF EXISTS "invitations_lookup_by_code" ON invitations;
DROP POLICY IF EXISTS "invitations_auth_read" ON invitations;

-- Only authenticated users (admin) can directly query invitations
CREATE POLICY "invitations_auth_read" ON invitations 
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- 6. Restrict direct table access for RSVPs  
--    Users can insert/update their own, but not read others
-- ============================================
DROP POLICY IF EXISTS "rsvps_anon_select" ON rsvps;

-- Anon users cannot directly SELECT from rsvps (use RPC instead)
-- They can still INSERT and UPDATE (needed for RSVP submission)
-- Keep existing insert/update policies

-- ============================================
-- 7. Admin functions (password protected)
--    These allow the admin page to function without Supabase Auth
-- ============================================
CREATE OR REPLACE FUNCTION admin_get_invitations(admin_password TEXT)
RETURNS TABLE (
    id UUID,
    code VARCHAR(20),
    party_name TEXT,
    guest_names TEXT[],
    party_size INTEGER,
    email TEXT,
    created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Check password (change 'trebbio2027' to your admin password)
    IF admin_password != 'trebbio2027' THEN
        RAISE EXCEPTION 'Invalid admin password';
    END IF;
    
    RETURN QUERY 
    SELECT i.id, i.code, i.party_name, i.guest_names, i.party_size, i.email, i.created_at
    FROM public.invitations i
    ORDER BY i.party_name;
END;
$$;

CREATE OR REPLACE FUNCTION admin_get_rsvps(admin_password TEXT)
RETURNS TABLE (
    id UUID,
    invitation_id UUID,
    guest_responses JSONB,
    dietary_restrictions TEXT,
    castle_preference TEXT,
    email TEXT,
    message TEXT,
    submitted_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF admin_password != 'trebbio2027' THEN
        RAISE EXCEPTION 'Invalid admin password';
    END IF;
    
    RETURN QUERY 
    SELECT r.id, r.invitation_id, r.guest_responses, r.dietary_restrictions,
           r.castle_preference, r.email, r.message, r.submitted_at
    FROM public.rsvps r
    ORDER BY r.submitted_at DESC;
END;
$$;

-- ============================================
-- 8. Grant execute permissions on RPC functions
-- ============================================
GRANT EXECUTE ON FUNCTION lookup_invitation(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION lookup_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_rsvp_by_invitation(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_rsvp_by_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_invitations(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION admin_get_invitations(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_rsvps(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION admin_get_rsvps(TEXT) TO authenticated;

-- ============================================
-- DONE
-- ============================================

