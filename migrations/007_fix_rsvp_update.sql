-- ============================================
-- Fix RSVP Update - Create RPC function
-- The UPDATE was failing because anon users can't SELECT rows to update
-- ============================================

-- Create a secure function to update RSVPs
CREATE OR REPLACE FUNCTION update_rsvp(
    inv_id UUID,
    p_guest_responses JSONB,
    p_dietary_restrictions TEXT,
    p_castle_preference TEXT,
    p_email TEXT,
    p_message TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    result_id UUID;
BEGIN
    UPDATE public.rsvps
    SET 
        guest_responses = p_guest_responses,
        dietary_restrictions = p_dietary_restrictions,
        castle_preference = p_castle_preference,
        email = p_email,
        message = p_message,
        updated_at = NOW()
    WHERE invitation_id = inv_id
    RETURNING id INTO result_id;
    
    IF result_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'RSVP not found');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'id', result_id);
END;
$$;

-- Create a secure function to insert RSVPs
CREATE OR REPLACE FUNCTION insert_rsvp(
    inv_id UUID,
    p_guest_responses JSONB,
    p_dietary_restrictions TEXT,
    p_castle_preference TEXT,
    p_email TEXT,
    p_message TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    result_id UUID;
BEGIN
    INSERT INTO public.rsvps (invitation_id, guest_responses, dietary_restrictions, castle_preference, email, message)
    VALUES (inv_id, p_guest_responses, p_dietary_restrictions, p_castle_preference, p_email, p_message)
    RETURNING id INTO result_id;
    
    RETURN jsonb_build_object('success', true, 'id', result_id);
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'error', 'RSVP already exists for this invitation');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_rsvp(UUID, JSONB, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION update_rsvp(UUID, JSONB, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION insert_rsvp(UUID, JSONB, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION insert_rsvp(UUID, JSONB, TEXT, TEXT, TEXT, TEXT) TO authenticated;

