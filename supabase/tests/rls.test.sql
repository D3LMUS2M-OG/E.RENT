-- pgTAP policy tests. Run with: supabase test db
begin;
select plan(25);

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

select cmp_ok((select count(*)::int from public.wards), '>=', 1400, 'visitor can read the ward list');
select is((select count(*)::int from public.landlord_verifications), 0, 'visitor cannot read verifications');
select is((select count(*)::int from public.verification_documents), 0, 'visitor cannot read verification documents');
select lives_ok($$select * from public.landlord_profiles$$, 'visitor can read the public landlord view');

select is((select count(*)::int from public.rental_requests), 0, 'visitor cannot read rental requests');
select is((select count(*)::int from public.rentals), 0, 'visitor cannot read rentals');

select is((select count(*)::int from public.contact_shares), 0, 'visitor cannot read contact shares');
select is((select count(*)::int from public.organization_invites), 0, 'visitor cannot read organisation invites');

select is((select count(*)::int from public.messages), 0, 'visitor cannot read messages');
select is((select count(*)::int from public.conversations), 0, 'visitor cannot read conversations');
select is((select count(*)::int from public.report_evidence), 0, 'visitor cannot read report evidence');
select is((select count(*)::int from public.user_sanctions), 0, 'visitor cannot read sanctions');

-- reviews: public to read, impossible to write directly, and the function refuses people without a rental or viewing
select lives_ok($$select * from public.public_reviews$$, 'visitor can read public reviews');
select throws_ok($$insert into public.reviews (listing_id, landlord_id, author_id, kind, overall, body) values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 'tour', 5, 'Great place, very clean')$$, '42501', null, 'visitor cannot insert a review directly');
select throws_ok($$select public.submit_review(gen_random_uuid(), 5, null, null, null, null, null, null, 'Great place, very clean')$$, '42501', null, 'visitor cannot call submit_review');

select is((select count(*)::int from public.notifications), 0, 'visitor cannot read notifications');
select is((select count(*)::int from public.notification_preferences), 0, 'visitor cannot read notification preferences');
select throws_ok($$select count(*) from public.notification_outbox$$, '42501', null, 'visitor cannot touch the notification outbox');

select * from finish();
rollback;
