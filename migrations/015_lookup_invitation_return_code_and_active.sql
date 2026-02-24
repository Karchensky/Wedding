-- ============================================
-- Lookup: return code and only active invitations
-- RSVP page needs code for the form; only active invitations can be looked up.
-- Must DROP first because return type is changing.
-- ============================================

DROP FUNCTION IF EXISTS lookup_invitation(TEXT, TEXT);
DROP FUNCTION IF EXISTS lookup_invitation(TEXT);

CREATE FUNCTION lookup_invitation(lookup_code TEXT, inv_type TEXT DEFAULT 'informal')
RETURNS TABLE (
    id UUID,
    code VARCHAR(20),
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
    SELECT i.id, i.code, i.party_name, i.guest_names, i.party_size
    FROM public.invitations i
    WHERE UPPER(i.code) = UPPER(lookup_code)
      AND i.invitation_type = COALESCE(inv_type, 'informal')
      AND (i.active = true OR i.active IS NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION lookup_invitation(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION lookup_invitation(TEXT, TEXT) TO authenticated;
