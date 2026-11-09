-- RUN ONCE, FIRST. Your database was created from a different foundation script than the one this app expects
-- (different counties, app_settings, staff_roles, profiles, hook). This removes ONLY those objects so that
-- migrations/20261108000100_foundation.sql can be applied cleanly. Safe while the project holds test data only.
-- Auth users are NOT touched.

drop function if exists public.custom_access_token_hook(jsonb) cascade;
drop table if exists public.admin_audit_log cascade;
drop table if exists public.staff_roles cascade;
drop table if exists public.user_roles cascade;
drop table if exists public.profiles cascade;
drop table if exists public.app_settings cascade;
drop table if exists public.counties cascade;
drop table if exists public.sub_counties cascade;
drop table if exists public.wards cascade;
drop table if exists public.delegations cascade;
drop table if exists public.organization_members cascade;
drop table if exists public.organizations cascade;
drop type if exists public.app_role cascade;

-- The migration installs pg_trgm in the extensions schema (index operator classes are qualified that way).
drop extension if exists pg_trgm cascade;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists postgis with schema extensions;
