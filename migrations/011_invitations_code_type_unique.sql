-- ============================================
-- One code per invitation; same code can exist for planning_request and invitation
-- Unique on (code, invitation_type) instead of code alone
-- ============================================

-- Drop old unique constraint/index on code only
DROP INDEX IF EXISTS idx_invitations_code;
ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_code_key;

-- Composite unique: one row per (code, invitation_type) — only if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.invitations'::regclass
      AND conname = 'invitations_code_invitation_type_key'
  ) THEN
    ALTER TABLE public.invitations
    ADD CONSTRAINT invitations_code_invitation_type_key UNIQUE (code, invitation_type);
  END IF;
END
$$;

-- Index for lookups by code (non-unique now)
CREATE INDEX IF NOT EXISTS idx_invitations_code ON public.invitations(code);

-- Lookup by code + type so the right row is returned when same code has planning and formal
-- Drop first so we never hit "cannot change return type" when re-running (e.g. 015 already ran)
DROP FUNCTION IF EXISTS lookup_invitation(TEXT, TEXT);
DROP FUNCTION IF EXISTS lookup_invitation(TEXT);

CREATE FUNCTION lookup_invitation(lookup_code TEXT, inv_type TEXT DEFAULT 'planning_request')
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
      AND i.invitation_type = COALESCE(inv_type, 'planning_request');
END;
$$;

GRANT EXECUTE ON FUNCTION lookup_invitation(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION lookup_invitation(TEXT, TEXT) TO authenticated;
