-- ============================================
-- Rename response tables to match flow: informal_rsvp, formal_rsvp
-- planning_requests → informal_rsvp (informal RSVP responses)
-- rsvps → formal_rsvp (formal RSVP responses)
-- ============================================

-- ---------- planning_requests → informal_rsvp ----------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'planning_requests')
       AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'informal_rsvp') THEN
        ALTER TABLE public.planning_requests RENAME TO informal_rsvp;
    END IF;
END $$;

-- Only rename constraint if it still has the old name
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON c.conrelid = t.oid
               WHERE t.relname = 'informal_rsvp' AND c.conname = 'planning_requests_invitation_unique') THEN
        ALTER TABLE public.informal_rsvp
        RENAME CONSTRAINT planning_requests_invitation_unique TO informal_rsvp_invitation_unique;
    END IF;
END $$;

DROP INDEX IF EXISTS public.idx_planning_requests_invitation_id;
CREATE INDEX IF NOT EXISTS idx_informal_rsvp_invitation_id ON public.informal_rsvp(invitation_id);

DROP POLICY IF EXISTS "planning_requests_anon_insert" ON public.informal_rsvp;
DROP POLICY IF EXISTS "planning_requests_anon_update" ON public.informal_rsvp;
DROP POLICY IF EXISTS "planning_requests_anon_select" ON public.informal_rsvp;
DROP POLICY IF EXISTS "planning_requests_auth_all" ON public.informal_rsvp;
DROP POLICY IF EXISTS "informal_rsvp_anon_insert" ON public.informal_rsvp;
DROP POLICY IF EXISTS "informal_rsvp_anon_update" ON public.informal_rsvp;
DROP POLICY IF EXISTS "informal_rsvp_anon_select" ON public.informal_rsvp;
DROP POLICY IF EXISTS "informal_rsvp_auth_all" ON public.informal_rsvp;

CREATE POLICY "informal_rsvp_anon_insert" ON public.informal_rsvp FOR INSERT WITH CHECK (true);
CREATE POLICY "informal_rsvp_anon_update" ON public.informal_rsvp FOR UPDATE USING (true);
CREATE POLICY "informal_rsvp_anon_select" ON public.informal_rsvp FOR SELECT USING (true);
CREATE POLICY "informal_rsvp_auth_all" ON public.informal_rsvp FOR ALL USING (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS update_planning_requests_updated_at ON public.informal_rsvp;
DROP TRIGGER IF EXISTS update_informal_rsvp_updated_at ON public.informal_rsvp;
CREATE TRIGGER update_informal_rsvp_updated_at
    BEFORE UPDATE ON public.informal_rsvp
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Drop old planning_request functions and create informal_rsvp equivalents
DROP FUNCTION IF EXISTS get_planning_request_by_invitation(UUID);
DROP FUNCTION IF EXISTS insert_planning_request(UUID, JSONB, TEXT, TEXT);
DROP FUNCTION IF EXISTS update_planning_request(UUID, JSONB, TEXT, TEXT);
DROP FUNCTION IF EXISTS admin_get_planning_requests(TEXT);

CREATE OR REPLACE FUNCTION get_informal_rsvp_by_invitation(inv_id UUID)
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
    FROM public.informal_rsvp p
    WHERE p.invitation_id = inv_id;
END;
$$;

CREATE OR REPLACE FUNCTION insert_informal_rsvp(
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
    INSERT INTO public.informal_rsvp (invitation_id, guest_responses, message, email)
    VALUES (inv_id, p_guest_responses, p_message, p_email)
    RETURNING id INTO result_id;
    RETURN jsonb_build_object('success', true, 'id', result_id);
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'error', 'Informal RSVP already exists for this invitation');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION update_informal_rsvp(
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
    UPDATE public.informal_rsvp
    SET guest_responses = p_guest_responses, message = p_message, email = p_email, updated_at = NOW()
    WHERE invitation_id = inv_id
    RETURNING id INTO result_id;
    IF result_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Informal RSVP not found');
    END IF;
    RETURN jsonb_build_object('success', true, 'id', result_id);
END;
$$;

CREATE OR REPLACE FUNCTION admin_get_informal_rsvp(admin_password TEXT)
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
    FROM public.informal_rsvp p
    ORDER BY p.submitted_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_informal_rsvp_by_invitation(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_informal_rsvp_by_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION insert_informal_rsvp(UUID, JSONB, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION insert_informal_rsvp(UUID, JSONB, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_informal_rsvp(UUID, JSONB, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION update_informal_rsvp(UUID, JSONB, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_informal_rsvp(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION admin_get_informal_rsvp(TEXT) TO authenticated;

-- ---------- rsvps → formal_rsvp ----------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rsvps')
       AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'formal_rsvp') THEN
        ALTER TABLE public.rsvps RENAME TO formal_rsvp;
    END IF;
END $$;

-- Only rename constraint if it still has the old name
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON c.conrelid = t.oid
               WHERE t.relname = 'formal_rsvp' AND c.conname = 'rsvps_invitation_unique') THEN
        ALTER TABLE public.formal_rsvp
        RENAME CONSTRAINT rsvps_invitation_unique TO formal_rsvp_invitation_unique;
    END IF;
END $$;

DROP INDEX IF EXISTS public.idx_rsvps_invitation_id;
CREATE INDEX IF NOT EXISTS idx_formal_rsvp_invitation_id ON public.formal_rsvp(invitation_id);

DROP POLICY IF EXISTS "rsvps_anon_insert" ON public.formal_rsvp;
DROP POLICY IF EXISTS "rsvps_anon_update" ON public.formal_rsvp;
DROP POLICY IF EXISTS "rsvps_anon_select" ON public.formal_rsvp;
DROP POLICY IF EXISTS "rsvps_auth_read" ON public.formal_rsvp;
DROP POLICY IF EXISTS "formal_rsvp_anon_insert" ON public.formal_rsvp;
DROP POLICY IF EXISTS "formal_rsvp_anon_update" ON public.formal_rsvp;
DROP POLICY IF EXISTS "formal_rsvp_anon_select" ON public.formal_rsvp;
DROP POLICY IF EXISTS "formal_rsvp_auth_all" ON public.formal_rsvp;

CREATE POLICY "formal_rsvp_anon_insert" ON public.formal_rsvp FOR INSERT WITH CHECK (true);
CREATE POLICY "formal_rsvp_anon_update" ON public.formal_rsvp FOR UPDATE USING (true);
CREATE POLICY "formal_rsvp_anon_select" ON public.formal_rsvp FOR SELECT USING (true);
CREATE POLICY "formal_rsvp_auth_all" ON public.formal_rsvp FOR ALL USING (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS update_rsvps_updated_at ON public.formal_rsvp;
DROP TRIGGER IF EXISTS update_formal_rsvp_updated_at ON public.formal_rsvp;
CREATE TRIGGER update_formal_rsvp_updated_at
    BEFORE UPDATE ON public.formal_rsvp
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP FUNCTION IF EXISTS get_rsvp_by_invitation(UUID);
DROP FUNCTION IF EXISTS update_rsvp(UUID, JSONB, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS insert_rsvp(UUID, JSONB, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS admin_get_rsvps(TEXT);

CREATE OR REPLACE FUNCTION get_formal_rsvp_by_invitation(inv_id UUID)
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
    FROM public.formal_rsvp r
    WHERE r.invitation_id = inv_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_formal_rsvp(
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
    UPDATE public.formal_rsvp
    SET guest_responses = p_guest_responses, dietary_restrictions = p_dietary_restrictions,
        castle_preference = p_castle_preference, email = p_email, message = p_message, updated_at = NOW()
    WHERE invitation_id = inv_id
    RETURNING id INTO result_id;
    IF result_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Formal RSVP not found');
    END IF;
    RETURN jsonb_build_object('success', true, 'id', result_id);
END;
$$;

CREATE OR REPLACE FUNCTION insert_formal_rsvp(
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
    INSERT INTO public.formal_rsvp (invitation_id, guest_responses, dietary_restrictions, castle_preference, email, message)
    VALUES (inv_id, p_guest_responses, p_dietary_restrictions, p_castle_preference, p_email, p_message)
    RETURNING id INTO result_id;
    RETURN jsonb_build_object('success', true, 'id', result_id);
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'error', 'Formal RSVP already exists for this invitation');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION admin_get_formal_rsvp(admin_password TEXT)
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
    FROM public.formal_rsvp r
    ORDER BY r.submitted_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_formal_rsvp_by_invitation(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_formal_rsvp_by_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_formal_rsvp(UUID, JSONB, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION update_formal_rsvp(UUID, JSONB, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION insert_formal_rsvp(UUID, JSONB, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION insert_formal_rsvp(UUID, JSONB, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_formal_rsvp(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION admin_get_formal_rsvp(TEXT) TO authenticated;
