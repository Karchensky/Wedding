-- ============================================
-- Invitation sent tracking & tiered sends
-- created_at = when invite record was created
-- sent_at = when invitation email was sent (null until sent)
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'invitations' AND column_name = 'sent_at'
    ) THEN
        ALTER TABLE public.invitations ADD COLUMN sent_at TIMESTAMPTZ;
    END IF;
END $$;

-- Admin view: include sent_at so dashboard can show who was sent and when
-- Must DROP first; PostgreSQL does not allow changing return type with CREATE OR REPLACE
DROP FUNCTION IF EXISTS admin_get_invitations(TEXT);

CREATE FUNCTION admin_get_invitations(admin_password TEXT)
RETURNS TABLE (
    id UUID,
    code VARCHAR(20),
    party_name TEXT,
    guest_names TEXT[],
    party_size INTEGER,
    email TEXT,
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
    SELECT i.id, i.code, i.party_name, i.guest_names, i.party_size, i.email, i.created_at, i.sent_at
    FROM public.invitations i
    ORDER BY i.party_name;
END;
$$;
