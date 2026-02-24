-- ============================================
-- Invitation type: planning_request | save_the_date | invitation
-- Supports early planning requests, save-the-dates (no response), and formal invites
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'invitations' AND column_name = 'invitation_type'
    ) THEN
        ALTER TABLE public.invitations
        ADD COLUMN invitation_type VARCHAR(32) NOT NULL DEFAULT 'planning_request'
        CHECK (invitation_type IN ('planning_request', 'save_the_date', 'invitation'));
    END IF;
END $$;

-- Admin view: include invitation_type
DROP FUNCTION IF EXISTS admin_get_invitations(TEXT);

CREATE FUNCTION admin_get_invitations(admin_password TEXT)
RETURNS TABLE (
    id UUID,
    code VARCHAR(20),
    party_name TEXT,
    guest_names TEXT[],
    party_size INTEGER,
    email TEXT,
    invitation_type VARCHAR(32),
    created_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ
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
    SELECT i.id, i.code, i.party_name, i.guest_names, i.party_size, i.email, i.invitation_type, i.created_at, i.sent_at
    FROM public.invitations i
    ORDER BY i.party_name;
END;
$$;
