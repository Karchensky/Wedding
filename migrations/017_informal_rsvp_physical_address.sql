-- ============================================
-- Add physical_address to informal_rsvp (for sending formal invites later)
-- ============================================

ALTER TABLE public.informal_rsvp
ADD COLUMN IF NOT EXISTS physical_address TEXT;

-- Update RPCs to include physical_address
DROP FUNCTION IF EXISTS get_informal_rsvp_by_invitation(UUID);
DROP FUNCTION IF EXISTS insert_informal_rsvp(UUID, JSONB, TEXT, TEXT);
DROP FUNCTION IF EXISTS update_informal_rsvp(UUID, JSONB, TEXT, TEXT);
DROP FUNCTION IF EXISTS admin_get_informal_rsvp(TEXT);

CREATE FUNCTION get_informal_rsvp_by_invitation(inv_id UUID)
RETURNS TABLE (
    id UUID,
    invitation_id UUID,
    guest_responses JSONB,
    message TEXT,
    email TEXT,
    physical_address TEXT,
    submitted_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.invitation_id, p.guest_responses, p.message, p.email, p.physical_address, p.submitted_at, p.updated_at
    FROM public.informal_rsvp p
    WHERE p.invitation_id = inv_id;
END;
$$;

CREATE FUNCTION insert_informal_rsvp(
    inv_id UUID,
    p_guest_responses JSONB,
    p_message TEXT,
    p_email TEXT,
    p_physical_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    result_id UUID;
BEGIN
    INSERT INTO public.informal_rsvp (invitation_id, guest_responses, message, email, physical_address)
    VALUES (inv_id, p_guest_responses, p_message, p_email, p_physical_address)
    RETURNING id INTO result_id;
    RETURN jsonb_build_object('success', true, 'id', result_id);
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'error', 'Informal RSVP already exists for this invitation');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

CREATE FUNCTION update_informal_rsvp(
    inv_id UUID,
    p_guest_responses JSONB,
    p_message TEXT,
    p_email TEXT,
    p_physical_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    result_id UUID;
BEGIN
    UPDATE public.informal_rsvp
    SET guest_responses = p_guest_responses, message = p_message, email = p_email, physical_address = p_physical_address, updated_at = NOW()
    WHERE invitation_id = inv_id
    RETURNING id INTO result_id;
    IF result_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Informal RSVP not found');
    END IF;
    RETURN jsonb_build_object('success', true, 'id', result_id);
END;
$$;

CREATE FUNCTION admin_get_informal_rsvp(admin_password TEXT)
RETURNS TABLE (
    id UUID,
    invitation_id UUID,
    guest_responses JSONB,
    message TEXT,
    email TEXT,
    physical_address TEXT,
    submitted_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
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
    SELECT p.id, p.invitation_id, p.guest_responses, p.message, p.email, p.physical_address, p.submitted_at, p.updated_at
    FROM public.informal_rsvp p
    ORDER BY p.submitted_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_informal_rsvp_by_invitation(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_informal_rsvp_by_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION insert_informal_rsvp(UUID, JSONB, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION insert_informal_rsvp(UUID, JSONB, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_informal_rsvp(UUID, JSONB, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION update_informal_rsvp(UUID, JSONB, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_informal_rsvp(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION admin_get_informal_rsvp(TEXT) TO authenticated;
