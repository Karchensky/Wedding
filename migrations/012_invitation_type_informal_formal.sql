-- ============================================
-- Rename invitation_type values: planning_request → informal, invitation → formal
-- Display: "Informal RSVP" and "Formal RSVP"
-- ============================================

DO $$
DECLARE
    c name;
BEGIN
    FOR c IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'public.invitations'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%invitation_type%'
    LOOP
        EXECUTE format('ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS %I', c);
    END LOOP;
END $$;

UPDATE public.invitations SET invitation_type = 'informal' WHERE invitation_type = 'planning_request';
UPDATE public.invitations SET invitation_type = 'formal' WHERE invitation_type = 'invitation';

ALTER TABLE public.invitations
ADD CONSTRAINT invitations_invitation_type_check
CHECK (invitation_type IN ('informal', 'save_the_date', 'formal'));

ALTER TABLE public.invitations
ALTER COLUMN invitation_type SET DEFAULT 'informal';

-- Lookup default: informal (was planning_request)
CREATE OR REPLACE FUNCTION lookup_invitation(lookup_code TEXT, inv_type TEXT DEFAULT 'informal')
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
    WHERE UPPER(i.code) = UPPER(lookup_code)
      AND i.invitation_type = COALESCE(inv_type, 'informal');
END;
$$;
