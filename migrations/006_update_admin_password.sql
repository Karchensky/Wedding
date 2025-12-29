-- ============================================
-- Update Admin Password in RPC Functions
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
    -- Check password
    IF admin_password != 'bryanemily2027' THEN
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
    IF admin_password != 'bryanemily2027' THEN
        RAISE EXCEPTION 'Invalid admin password';
    END IF;
    
    RETURN QUERY 
    SELECT r.id, r.invitation_id, r.guest_responses, r.dietary_restrictions,
           r.castle_preference, r.email, r.message, r.submitted_at
    FROM public.rsvps r
    ORDER BY r.submitted_at DESC;
END;
$$;

