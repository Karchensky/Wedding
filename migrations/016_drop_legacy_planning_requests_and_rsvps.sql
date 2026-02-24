-- ============================================
-- Cleanup: drop legacy planning_requests and rsvps if they exist
--
-- Why: The migration runner runs ALL .sql files every time (no "already applied"
-- tracking). So 001_initial_schema.sql recreates "rsvps" and 010_planning_requests_table.sql
-- recreates "planning_requests" on every run. After 013 renamed them to formal_rsvp and
-- informal_rsvp, those recreated tables are redundant. This migration drops them so
-- you only have: invitations, informal_rsvp, formal_rsvp, shared_photos.
-- ============================================

DROP TABLE IF EXISTS public.planning_requests CASCADE;
DROP TABLE IF EXISTS public.rsvps CASCADE;
