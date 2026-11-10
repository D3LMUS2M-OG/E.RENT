-- Step 5 (verification, delegation) + geography hierarchy + search v2.
-- Depends on 20261108000100_foundation.sql and 20261109000200_listings.sql.

-- ───────── Geography: coordinates and links ─────────
alter table public.sub_counties add column if not exists lat double precision, add column if not exists lng double precision,
  add column if not exists external_id text;
alter table public.wards add column if not exists lat double precision, add column if not exists lng double precision,
  add column if not exists external_id text;
alter table public.properties
  add column if not exists sub_county_id integer references public.sub_counties(id),
  add column if not exists ward_id integer references public.wards(id);
create index if not exists properties_sub_county_idx on public.properties (sub_county_id);
create index if not exists properties_ward_idx on public.properties (ward_id);

-- A ward must belong to the chosen sub-county, and the sub-county to the chosen county
create function private.property_geo_check() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.ward_id is not null then
    select sub_county_id into new.sub_county_id from public.wards where id = new.ward_id;
  end if;
  if new.sub_county_id is not null then
    if not exists (select 1 from public.sub_counties where id = new.sub_county_id and county_id = new.county_id) then
      raise exception 'That sub-county is not in the chosen county';
    end if;
    select name into new.sub_county from public.sub_counties where id = new.sub_county_id;
  else
    new.sub_county := null;
  end if;
  return new;
end $$;
create trigger properties_geo before insert or update on public.properties for each row execute function private.property_geo_check();

-- Suggest the ward for a dropped pin (nearest ward centre). A suggestion only: landlords can change it.
create function public.nearest_ward(p_lat double precision, p_lng double precision, p_county smallint default null)
returns table (county_id smallint, sub_county_id integer, ward_id integer, ward_name text, sub_county_name text)
language sql stable security invoker set search_path = public as $$
  select sc.county_id, w.sub_county_id, w.id, w.name, sc.name
  from public.wards w join public.sub_counties sc on sc.id = w.sub_county_id
  where w.lat is not null and (p_county is null or sc.county_id = p_county)
  order by power(w.lat - p_lat, 2) + power((w.lng - p_lng) * cos(radians(p_lat)), 2)
  limit 1;
$$;

-- ───────── Verification (ACC-5, ACC-6) ─────────
create type public.verification_status as enum ('draft', 'pending', 'approved', 'rejected');
create type public.verification_doc_kind as enum ('national_id_front', 'national_id_back', 'proof_of_ownership', 'kra_pin', 'selfie_with_id');
create type public.ownership_kind as enum ('title_deed', 'lease', 'utility_bill');

create table public.landlord_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  status public.verification_status not null default 'draft',
  ownership_kind public.ownership_kind,
  submitted_at timestamptz,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.landlord_verifications (status, submitted_at);

create table public.verification_documents (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.landlord_verifications(id) on delete cascade,
  kind public.verification_doc_kind not null,
  storage_path text not null unique,
  mime text,
  created_at timestamptz not null default now(),
  unique (verification_id, kind)
);

create function private.is_verified(uid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.landlord_verifications where user_id = uid and status = 'approved');
$$;

create function private.verification_rules() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := (select auth.uid());
  verifier boolean := private.has_permission('verification.approve');
begin
  if tg_op = 'INSERT' then
    new.status := 'draft'; new.reviewed_by := null; new.reviewed_at := null; new.reject_reason := null; new.submitted_at := null;
    return new;
  end if;
  if actor is null then return new; end if;                       -- service role
  if new.user_id <> old.user_id then raise exception 'Applicant cannot change'; end if;
  new.updated_at := now();

  if new.status in ('approved', 'rejected') and new.status is distinct from old.status then
    if not verifier then raise exception 'Only a verifier can decide a verification'; end if;
    if new.user_id = actor then raise exception 'Another verifier must decide your own application'; end if;
    if old.status not in ('pending', 'approved') then raise exception 'Only submitted applications can be decided'; end if;
    if new.status = 'rejected' and char_length(coalesce(new.reject_reason, '')) < 10 then
      raise exception 'Give the applicant a reason of at least 10 characters';
    end if;
    new.reviewed_by := actor; new.reviewed_at := now();
    if new.status = 'approved' then new.reject_reason := null; end if;
    return new;
  end if;

  -- applicant edits
  new.reviewed_by := old.reviewed_by; new.reviewed_at := old.reviewed_at;
  if new.status = 'pending' and old.status is distinct from 'pending' then
    if old.status not in ('draft', 'rejected') then raise exception 'This application cannot be submitted'; end if;
    if new.ownership_kind is null then raise exception 'Choose the kind of ownership proof'; end if;
    if not exists (select 1 from public.verification_documents where verification_id = new.id and kind = 'national_id_front')
       or not exists (select 1 from public.verification_documents where verification_id = new.id and kind = 'proof_of_ownership') then
      raise exception 'Upload your National ID and a proof of ownership first';
    end if;
    new.submitted_at := now(); new.reject_reason := null;
  elsif new.status = 'draft' and old.status in ('pending', 'draft', 'rejected') then
    null;                                                          -- withdraw
  elsif new.status is distinct from old.status then
    raise exception 'That status change is not allowed';
  end if;
  if old.status in ('approved') and not verifier then raise exception 'An approved verification cannot be edited'; end if;
  return new;
end $$;
create trigger verification_rules before insert or update on public.landlord_verifications for each row execute function private.verification_rules();

alter table public.landlord_verifications enable row level security;
alter table public.verification_documents enable row level security;

create policy ver_select on public.landlord_verifications for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_permission('verification.approve')));
create policy ver_insert on public.landlord_verifications for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.has_role((select auth.uid()), 'landlord')));
create policy ver_update on public.landlord_verifications for update to authenticated
  using (user_id = (select auth.uid()) or (select private.has_permission('verification.approve')))
  with check (user_id = (select auth.uid()) or (select private.has_permission('verification.approve')));

create policy vdoc_select on public.verification_documents for select to authenticated using (
  (select private.has_permission('verification.approve'))
  or exists (select 1 from public.landlord_verifications v where v.id = verification_id and v.user_id = (select auth.uid())));
create policy vdoc_insert on public.verification_documents for insert to authenticated with check (
  exists (select 1 from public.landlord_verifications v where v.id = verification_id and v.user_id = (select auth.uid()) and v.status in ('draft', 'rejected')));
create policy vdoc_delete_own on public.verification_documents for delete to authenticated using (
  exists (select 1 from public.landlord_verifications v where v.id = verification_id and v.user_id = (select auth.uid()) and v.status in ('draft', 'rejected')));
-- Verifiers delete documents after a decision, so identity documents are not kept longer than needed
create policy vdoc_delete_staff on public.verification_documents for delete to authenticated
  using ((select private.has_permission('verification.approve')));

-- Private bucket: nothing is public. Documents are shown through short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verification-docs', 'verification-docs', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "verification docs insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "verification docs read own or verifier" on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.has_permission('verification.approve'))));
create policy "verification docs delete own or verifier" on storage.objects for delete to authenticated
  using (bucket_id = 'verification-docs' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.has_permission('verification.approve'))));

-- Public view of landlords who have a live listing: name, member-since, verified badge. Nothing else.
create view public.landlord_profiles with (security_invoker = false) as
select p.id, p.full_name as display_name, p.created_at as member_since, private.is_verified(p.id) as verified
from public.profiles p
where exists (select 1 from public.listings l where l.owner_id = p.id and l.status = 'active' and l.expires_at > now());
grant select on public.landlord_profiles to anon, authenticated;

-- ───────── Delegation by email invitation (ACC-7) ─────────
alter table public.delegations alter column delegate_id drop not null;
alter table public.delegations
  add column invited_email text,
  add column kind text not null default 'caretaker' check (kind in ('caretaker', 'agent')),
  add column responded_at timestamptz,
  add constraint deleg_target check (delegate_id is not null or invited_email is not null);
create unique index delegations_email_uniq on public.delegations (landlord_id, lower(invited_email))
  where invited_email is not null and status <> 'revoked';

create function private.my_email() returns text language sql stable security definer set search_path = '' as $$
  select lower(email) from auth.users where id = (select auth.uid());
$$;

drop policy deleg_select on public.delegations;
drop policy deleg_insert on public.delegations;
drop policy deleg_delegate_accept on public.delegations;
create policy deleg_select on public.delegations for select to authenticated using (
  landlord_id = (select auth.uid()) or delegate_id = (select auth.uid())
  or (status = 'invited' and lower(invited_email) = (select private.my_email())));
create policy deleg_insert on public.delegations for insert to authenticated with check (
  landlord_id = (select auth.uid()) and status = 'invited' and delegate_id is null and invited_email is not null
  and lower(invited_email) <> (select private.my_email())
  and (select private.has_role((select auth.uid()), 'landlord')));

-- A landlord may only revoke. Accepting or declining goes through respond_delegation().
create function private.delegation_rules() returns trigger language plpgsql as $$
begin
  if (select auth.uid()) is null or current_setting('app.bypass_delegation_rules', true) = 'on' then return new; end if;
  if new.status is distinct from old.status and new.status <> 'revoked' then raise exception 'You can only revoke access'; end if;
  new.delegate_id := old.delegate_id; new.invited_email := old.invited_email; new.landlord_id := old.landlord_id; new.kind := old.kind;
  return new;
end $$;
create trigger delegations_rules before update on public.delegations for each row execute function private.delegation_rules();

create function public.respond_delegation(p_id uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare d public.delegations; mail text; confirmed timestamptz; uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'Sign in first'; end if;
  select lower(u.email), u.email_confirmed_at into mail, confirmed from auth.users u where u.id = uid;
  select * into d from public.delegations where id = p_id for update;
  if not found or d.status <> 'invited' or lower(d.invited_email) is distinct from mail then raise exception 'Invitation not found'; end if;
  if p_accept and confirmed is null then raise exception 'Confirm your email address first'; end if;
  perform set_config('app.bypass_delegation_rules', 'on', true);
  if p_accept then
    update public.delegations set delegate_id = uid, status = 'active', responded_at = now() where id = p_id;
    insert into public.user_roles (user_id, role) values (uid, 'agent') on conflict do nothing;
  else
    update public.delegations set delegate_id = uid, status = 'revoked', responded_at = now() where id = p_id;
  end if;
end $$;
revoke all on function public.respond_delegation(uuid, boolean) from public, anon;
grant execute on function public.respond_delegation(uuid, boolean) to authenticated;

-- Delegates (and anyone) see a landlord's public name through landlord_profiles. A delegate needs the names of the
-- landlords they serve even before those have a live listing:
create function public.my_landlords() returns table (landlord_id uuid, display_name text, kind text)
language sql stable security definer set search_path = '' as $$
  select d.landlord_id, p.full_name, d.kind from public.delegations d join public.profiles p on p.id = d.landlord_id
  where d.delegate_id = (select auth.uid()) and d.status = 'active';
$$;
revoke all on function public.my_landlords() from public, anon;
grant execute on function public.my_landlords() to authenticated;

create function public.my_invitations() returns table (id uuid, landlord_name text, kind text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select d.id, p.full_name, d.kind, d.created_at from public.delegations d join public.profiles p on p.id = d.landlord_id
  where d.status = 'invited' and lower(d.invited_email) = (select private.my_email());
$$;
revoke all on function public.my_invitations() from public, anon;
grant execute on function public.my_invitations() to authenticated;

-- ───────── Search v2: ward and sub-county by slug, verified-only, verified flag in results ─────────
drop function public.search_listings(jsonb);
create function public.search_listings(filters jsonb default '{}')
returns table (
  id uuid, slug text, title text, rent integer, deposit integer, bedrooms smallint, bathrooms smallint,
  property_type text, county text, county_slug text, sub_county text, ward text, estate text,
  lat double precision, lng double precision, cover_path text, units_available smallint,
  published_at timestamptz, managed_by_caretaker boolean, landlord_verified boolean, distance_m double precision, total_count bigint
)
language plpgsql stable security invoker set search_path = public, extensions as $$
#variable_conflict use_column
declare
  v_county text := nullif(filters ->> 'county', '');
  v_sub text := nullif(filters ->> 'sub_county', '');
  v_ward text := nullif(filters ->> 'ward', '');
  v_verified boolean := coalesce((filters ->> 'verified_only')::boolean, false);
  v_estate text := nullif(filters ->> 'estate', '');
  v_q text := nullif(filters ->> 'q', '');
  v_types text[] := coalesce(array(select jsonb_array_elements_text(filters -> 'types')), '{}');
  v_amen text[] := coalesce(array(select jsonb_array_elements_text(filters -> 'amenities')), '{}');
  v_lat double precision := (filters ->> 'lat')::double precision;
  v_lng double precision := (filters ->> 'lng')::double precision;
  v_radius double precision := coalesce((filters ->> 'radius_m')::double precision, 5000);
  v_sort text := coalesce(filters ->> 'sort', 'newest');
  v_limit int := least(coalesce((filters ->> 'limit')::int, 24), 200);
  v_offset int := greatest(coalesce((filters ->> 'offset')::int, 0), 0);
  v_pt geography;
begin
  if v_lat is not null and v_lng is not null then
    v_pt := st_setsrid(st_makepoint(v_lng, v_lat), 4326)::geography;
  elsif v_sort = 'distance' then
    v_sort := 'newest';
  end if;

  return query
  select l.id, l.slug, l.title, l.rent, l.deposit, l.bedrooms, l.bathrooms,
         pt.name, c.name, c.slug, sc.name, w.name, p.estate,
         p.lat, p.lng,
         (select m.path_960 from public.listing_media m where m.listing_id = l.id and m.kind = 'photo' order by m.position, m.created_at limit 1),
         l.units_available, l.published_at, (l.created_by <> l.owner_id), private.is_verified(l.owner_id),
         case when v_pt is null then null else st_distance(p.location, v_pt) end,
         count(*) over ()
  from public.listings l
  join public.properties p on p.id = l.property_id
  join public.counties c on c.id = p.county_id
  left join public.sub_counties sc on sc.id = p.sub_county_id
  left join public.wards w on w.id = p.ward_id
  join public.property_types pt on pt.id = l.property_type_id
  where l.status = 'active' and l.expires_at > now()
    and (v_county is null or c.slug = v_county)
    and (v_sub is null or sc.slug = v_sub)
    and (v_ward is null or w.slug = v_ward)
    and (not v_verified or private.is_verified(l.owner_id))
    and (v_estate is null or p.estate ilike '%' || v_estate || '%')
    and (v_q is null or to_tsvector('simple', l.title || ' ' || l.description) @@ plainto_tsquery('simple', v_q)
         or l.title ilike '%' || v_q || '%' or p.estate ilike '%' || v_q || '%')
    and (not filters ? 'min_rent' or l.rent >= (filters ->> 'min_rent')::int)
    and (not filters ? 'max_rent' or l.rent <= (filters ->> 'max_rent')::int)
    and (not filters ? 'max_deposit' or l.deposit <= (filters ->> 'max_deposit')::int)
    and (cardinality(v_types) = 0 or pt.slug = any (v_types))
    and (not filters ? 'min_bedrooms' or l.bedrooms >= (filters ->> 'min_bedrooms')::int)
    and (not filters ? 'max_bedrooms' or l.bedrooms <= (filters ->> 'max_bedrooms')::int)
    and (not filters ? 'min_bathrooms' or l.bathrooms >= (filters ->> 'min_bathrooms')::int)
    and (not filters ? 'min_size' or l.size_sqm >= (filters ->> 'min_size')::int)
    and (not filters ? 'floor' or l.floor = (filters ->> 'floor')::int)
    and (not filters ? 'available_by' or l.available_from <= (filters ->> 'available_by')::date)
    and (not filters ? 'posted_within_days' or l.published_at >= now() - make_interval(days => (filters ->> 'posted_within_days')::int))
    and (coalesce(filters ->> 'managed_by', '') = '' or (filters ->> 'managed_by' = 'owner' and l.created_by = l.owner_id)
         or (filters ->> 'managed_by' = 'caretaker' and l.created_by <> l.owner_id))
    and (cardinality(v_amen) = 0 or (
          select count(*) from public.listing_amenities la join public.amenities a on a.id = la.amenity_id
          where la.listing_id = l.id and a.slug = any (v_amen)) = cardinality(v_amen))
    and (v_pt is null or st_dwithin(p.location, v_pt, v_radius))
    and (not filters ? 'west' or st_intersects(p.location::geometry,
          st_makeenvelope((filters ->> 'west')::float, (filters ->> 'south')::float, (filters ->> 'east')::float, (filters ->> 'north')::float, 4326)))
  order by
    case when v_sort = 'distance' then st_distance(p.location, v_pt) end asc,
    case when v_sort = 'price_asc' then l.rent end asc,
    case when v_sort = 'price_desc' then l.rent end desc,
    l.published_at desc
  limit v_limit offset v_offset;
end $$;
