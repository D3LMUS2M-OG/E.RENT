-- Final gaps: landlord availability and response time, landlords rating tenants, optional staff two-factor requirement.

-- ───────── Availability hours (public) ─────────
create table public.landlord_availability (
  user_id uuid primary key references auth.users(id) on delete cascade,
  days smallint[] not null default '{1,2,3,4,5}' check (days <@ array[1,2,3,4,5,6,7]::smallint[] and cardinality(days) between 1 and 7),
  start_time time not null default '08:00',
  end_time time not null default '18:00',
  note text not null default '' check (char_length(note) <= 200),
  updated_at timestamptz not null default now()
);
alter table public.landlord_availability enable row level security;
create policy availability_read on public.landlord_availability for select to anon, authenticated using (true);
create policy availability_own on public.landlord_availability for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ───────── Response time: median minutes to the first reply, last 90 days ─────────
-- A chat nobody answered for 3 days counts as 3 days. Needs at least 3 conversations before it is shown.
create function public.landlord_response(p_landlord uuid) returns table (median_minutes integer, conversations integer)
language sql stable security definer set search_path = '' as $$
  with first_msg as (
    select c.id, c.tenant_id,
           (select min(m.created_at) from public.messages m where m.conversation_id = c.id and m.sender_id = c.tenant_id) as t0
      from public.conversations c where c.owner_id = p_landlord and c.created_at > now() - interval '90 days'
  ), timed as (
    select f.id, f.t0,
           (select min(m.created_at) from public.messages m where m.conversation_id = f.id and m.sender_id <> f.tenant_id and m.created_at > f.t0) as t1
      from first_msg f where f.t0 is not null
  ), mins as (
    select case when t1 is not null then extract(epoch from (t1 - t0)) / 60
                when t0 < now() - interval '3 days' then 4320 end as m from timed
  )
  select round(percentile_cont(0.5) within group (order by m))::int, count(*)::int from mins where m is not null having count(*) >= 3;
$$;
revoke all on function public.landlord_response(uuid) from public;
grant execute on function public.landlord_response(uuid) to anon, authenticated;

-- ───────── Landlords rate tenants (visible only to landlords) ─────────
create table public.tenant_ratings (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references auth.users(id) on delete cascade,
  rental_id uuid not null unique references public.rentals(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.tenant_ratings (tenant_id);
alter table public.tenant_ratings enable row level security;   -- no policies: everything goes through the functions below
revoke all on public.tenant_ratings from anon, authenticated;

create function public.rate_tenant(p_rental uuid, p_rating int, p_note text default '') returns void
language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_owner uuid;
begin
  select r.tenant_id, l.owner_id into v_tenant, v_owner from public.rentals r join public.listings l on l.id = r.listing_id where r.id = p_rental and r.status = 'confirmed';
  if v_tenant is null then raise exception 'You can rate a tenant after the rental is confirmed'; end if;
  if v_owner <> (select auth.uid()) then raise exception 'Only the landlord can rate the tenant'; end if;
  insert into public.tenant_ratings (landlord_id, tenant_id, rental_id, rating, note) values (v_owner, v_tenant, p_rental, p_rating, left(btrim(coalesce(p_note, '')), 200))
  on conflict (rental_id) do update set rating = excluded.rating, note = excluded.note, updated_at = now();
end $$;
revoke all on function public.rate_tenant(uuid, int, text) from public, anon;
grant execute on function public.rate_tenant(uuid, int, text) to authenticated;

-- What other landlords said about the tenant behind a request (only for the listing's owner or delegate)
create function public.tenant_reputation(p_request uuid) returns table (rating_count integer, avg_rating numeric, notes text[])
language plpgsql stable security definer set search_path = '' as $$
declare v_tenant uuid; v_listing uuid;
begin
  select tenant_id, listing_id into v_tenant, v_listing from public.rental_requests where id = p_request;
  if v_tenant is null or not private.owns_listing(v_listing) then return; end if;
  return query select count(*)::int, round(avg(t.rating), 1),
    coalesce((select array_agg(x.note) from (select t2.note from public.tenant_ratings t2 where t2.tenant_id = v_tenant and t2.note <> '' order by t2.updated_at desc limit 3) x), '{}')
    from public.tenant_ratings t where t.tenant_id = v_tenant having count(*) > 0;
end $$;
revoke all on function public.tenant_reputation(uuid) from public, anon;
grant execute on function public.tenant_reputation(uuid) to authenticated;

create function public.my_tenant_ratings() returns table (rental_id uuid, rating smallint, note text)
language sql stable security definer set search_path = '' as $$
  select t.rental_id, t.rating, t.note from public.tenant_ratings t where t.landlord_id = (select auth.uid());
$$;
revoke all on function public.my_tenant_ratings() from public, anon;
grant execute on function public.my_tenant_ratings() to authenticated;

-- ───────── Staff two-factor requirement (switch on in Admin, Settings once every staff member has enrolled) ─────────
insert into public.app_settings (key, value) values ('require_staff_mfa', 'false'::jsonb) on conflict (key) do nothing;
