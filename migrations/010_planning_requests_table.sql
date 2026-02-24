-- ============================================
-- Planning requests: separate table from formal RSVPs
-- One row per invitation; guest_responses = [{ name, response: 'yes'|'no'|'not_sure' }]
-- ============================================

CREATE TABLE IF NOT EXISTS planning_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
    guest_responses JSONB NOT NULL,
    message TEXT,
    email TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT planning_requests_invitation_unique UNIQUE(invitation_id)
);

CREATE INDEX IF NOT EXISTS idx_planning_requests_invitation_id ON planning_requests(invitation_id);

ALTER TABLE planning_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planning_requests_anon_insert" ON planning_requests;
DROP POLICY IF EXISTS "planning_requests_anon_update" ON planning_requests;
DROP POLICY IF EXISTS "planning_requests_anon_select" ON planning_requests;
DROP POLICY IF EXISTS "planning_requests_auth_all" ON planning_requests;

CREATE POLICY "planning_requests_anon_insert" ON planning_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "planning_requests_anon_update" ON planning_requests FOR UPDATE USING (true);
CREATE POLICY "planning_requests_anon_select" ON planning_requests FOR SELECT USING (true);
CREATE POLICY "planning_requests_auth_all" ON planning_requests FOR ALL USING (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS update_planning_requests_updated_at ON planning_requests;
CREATE TRIGGER update_planning_requests_updated_at
    BEFORE UPDATE ON planning_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Public: get existing planning request by invitation (for form pre-fill / update check)
CREATE OR REPLACE FUNCTION get_planning_request_by_invitation(inv_id UUID)
RETURNS TABLE (
    id UUID,
    invitation_id UUID,
    guest_responses JSONB,
    message TEXT,
    email TEXT,
    submitted_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.invitation_id, p.guest_responses, p.message, p.email, p.submitted_at, p.updated_at
    FROM public.planning_requests p
    WHERE p.invitation_id = inv_id;
END;
$$;

CREATE OR REPLACE FUNCTION insert_planning_request(
    inv_id UUID,
    p_guest_responses JSONB,
    p_message TEXT,
    p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    result_id UUID;
BEGIN
    INSERT INTO public.planning_requests (invitation_id, guest_responses, message, email)
    VALUES (inv_id, p_guest_responses, p_message, p_email)
    RETURNING id INTO result_id;
    RETURN jsonb_build_object('success', true, 'id', result_id);
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'error', 'Planning request already exists for this invitation');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION update_planning_request(
    inv_id UUID,
    p_guest_responses JSONB,
    p_message TEXT,
    p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    result_id UUID;
BEGIN
    UPDATE public.planning_requests
    SET guest_responses = p_guest_responses, message = p_message, email = p_email, updated_at = NOW()
    WHERE invitation_id = inv_id
    RETURNING id INTO result_id;
    IF result_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Planning request not found');
    END IF;
    RETURN jsonb_build_object('success', true, 'id', result_id);
END;
$$;

GRANT EXECUTE ON FUNCTION get_planning_request_by_invitation(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_planning_request_by_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION insert_planning_request(UUID, JSONB, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION insert_planning_request(UUID, JSONB, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_planning_request(UUID, JSONB, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION update_planning_request(UUID, JSONB, TEXT, TEXT) TO authenticated;

-- Admin: fetch all planning requests (password-protected)
CREATE OR REPLACE FUNCTION admin_get_planning_requests(admin_password TEXT)
RETURNS TABLE (
    id UUID,
    invitation_id UUID,
    guest_responses JSONB,
    message TEXT,
    email TEXT,
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
    SELECT p.id, p.invitation_id, p.guest_responses, p.message, p.email, p.submitted_at, p.updated_at
    FROM public.planning_requests p
    ORDER BY p.submitted_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_planning_requests(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION admin_get_planning_requests(TEXT) TO authenticated;
