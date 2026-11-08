-- pgTAP policy tests. Run with: supabase test db
begin;
select plan(7);

select is(
  (select count(*)::int from pg_tables t where t.schemaname = 'public' and not t.rowsecurity),
  0, 'every public table has RLS enabled');

select is((select count(*)::int from public.counties), 47, 'seed loads 47 counties');

-- visitor
set local role anon;
select is((select count(*)::int from public.counties), 47, 'visitor can read counties');
select is((select count(*)::int from public.staff_roles), 0, 'visitor cannot read staff roles');
select is((select count(*)::int from public.profiles), 0, 'visitor cannot read profiles');
select throws_ok($$insert into public.app_settings (key, value) values ('x','true')$$, '42501', null, 'visitor cannot write flags');
select throws_ok($$delete from public.admin_audit_log$$, '42501', null, 'visitor cannot touch the audit log');

select * from finish();
rollback;
