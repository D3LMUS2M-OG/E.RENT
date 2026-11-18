-- Step 6 listings and media, Step 7 search function. Depends on 20261108000100_foundation.sql.

create type public.listing_status as enum
  ('draft', 'pending_owner_approval', 'active', 'paused', 'rented', 'unavailable', 'expired', 'taken_down');
create type public.media_kind as enum ('photo', 'video');

-- ───────── Admin-managed lists ─────────
create table public.property_types (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  sort smallint not null default 0,
  is_active boolean not null default true
);
create table public.amenities (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  category text not null default 'general',
  is_active boolean not null default true
);

-- ───────── Helpers ─────────
create function private.has_role(uid uuid, r public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = uid and role = r);
$$;
create function private.is_delegate_of(owner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.delegations
    where landlord_id = owner and delegate_id = (select auth.uid()) and status = 'active');
$$;

-- ───────── Properties (a building or location with an exact pin) ─────────
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text,
  county_id smallint not null references public.counties(id),
  sub_county text,
  estate text,
  location extensions.geography(Point, 4326) not null,
  lat double precision generated always as (extensions.st_y(location::extensions.geometry)) stored,
  lng double precision generated always as (extensions.st_x(location::extensions.geometry)) stored,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index on public.properties (owner_id);
create index on public.properties (county_id);
create index properties_location_gix on public.properties using gist (location);
create index properties_estate_trgm on public.properties using gin (estate extensions.gin_trgm_ops);

-- ───────── Listings (a unit type, with units_total and units_available) ─────────
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  property_id uuid not null references public.properties(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  property_type_id smallint not null references public.property_types(id),
  title text not null check (char_length(title) between 10 and 100),
  description text not null check (char_length(description) between 30 and 4000),
  rent integer not null check (rent between 500 and 10000000),
  deposit integer not null default 0 check (deposit >= 0),
  bedrooms smallint not null default 0 check (bedrooms between 0 and 20),
  bathrooms smallint not null default 1 check (bathrooms between 0 and 20),
  size_sqm integer check (size_sqm > 0),
  floor smallint,
  available_from date not null default current_date,
  units_total smallint not null default 1 check (units_total >= 1),
  units_available smallint not null default 1,
  status public.listing_status not null default 'draft',
  watermark boolean not null default false,
  takedown_reason text,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (units_available between 0 and units_total)
);
create index on public.listings (owner_id);
create index on public.listings (property_id);
create index on public.listings (created_by);
create index on public.listings (property_type_id);
create index listings_public_idx on public.listings (status, expires_at, published_at desc);
create index listings_rent_idx on public.listings (rent) where status = 'active';
create index listings_fts on public.listings using gin (to_tsvector('simple', title || ' ' || description));

create table public.listing_amenities (
  listing_id uuid not null references public.listings(id) on delete cascade,
  amenity_id smallint not null references public.amenities(id),
  primary key (listing_id, amenity_id)
);
create index on public.listing_amenities (amenity_id);

create table public.listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  kind public.media_kind not null,
  path_480 text, path_960 text, path_1600 text,   -- photo variants (WebP)
  path_video text,                                 -- video original
  blur_data_url text,
  phash bigint,                                    -- 64-bit perceptual hash for duplicate detection
  width integer, height integer,
  position smallint not null default 0,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check ((kind = 'photo' and path_960 is not null) or (kind = 'video' and path_video is not null))
);
create index on public.listing_media (listing_id, position);
create index on public.listing_media (phash) where phash is not null;

create table public.listing_flags (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  kind text not null check (kind in ('duplicate_photo', 'duplicate_location', 'photo_review', 'report')),
  detail jsonb not null default '{}',
  status text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  resolved_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index on public.listing_flags (listing_id);
create index on public.listing_flags (status, created_at desc);

create table public.favourites (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
create index on public.favourites (listing_id);

-- ───────── Rules in the database ─────────
create function private.touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger listings_touch before update on public.listings for each row execute function private.touch();

-- Slug: title + short id, set on insert
create function private.set_listing_slug() returns trigger language plpgsql as $$
begin
  new.slug := trim(both '-' from regexp_replace(lower(left(new.title, 60)), '[^a-z0-9]+', '-', 'g'))
              || '-' || substr(replace(new.id::text, '-', ''), 1, 8);
  return new;
end $$;
create trigger listings_slug before insert on public.listings for each row execute function private.set_listing_slug();

-- Status rules: 90-day expiry, 3 photo minimum, owner-only approval, takedown lock
create function private.listing_rules() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := (select auth.uid());
  photos int;
begin
  if tg_op = 'INSERT' and new.status not in ('draft', 'pending_owner_approval') then
    raise exception 'New listings start as a draft';
  end if;
  new.units_available := least(new.units_available, new.units_total);

  if tg_op = 'UPDATE' then
    if old.status = 'taken_down' and new.status <> 'taken_down' and not private.has_permission('listing.takedown') then
      raise exception 'This listing was taken down by a moderator and cannot be restored by the owner';
    end if;
    if new.status = 'taken_down' and old.status <> 'taken_down' and not private.has_permission('listing.takedown') then
      raise exception 'Only a moderator can take down a listing';
    end if;
    if new.owner_id <> old.owner_id then raise exception 'Owner cannot change'; end if;
  end if;

  -- Only the landlord may make a listing live. Agents and caretakers submit for approval.
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    if actor is not null and actor <> new.owner_id and not private.has_permission('listing.takedown') then
      raise exception 'Only the landlord can approve this listing';
    end if;
    select count(*) into photos from public.listing_media where listing_id = new.id and kind = 'photo';
    if photos < 3 then
      raise exception 'Add at least 3 photos before publishing (you have %)', photos;
    end if;
    new.published_at := coalesce(new.published_at, now());
    if new.expires_at is null or new.expires_at <= now() then
      new.expires_at := now() + interval '90 days';
    end if;
  end if;
  return new;
end $$;
create trigger listings_rules before insert or update on public.listings for each row execute function private.listing_rules();

-- Media limits: 3 to 7 photos (minimum is checked at publish), at most 1 video
create function private.media_limits() returns trigger language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform 1 from public.listings where id = new.listing_id for update;  -- serialise concurrent uploads
  select count(*) into n from public.listing_media where listing_id = new.listing_id and kind = new.kind;
  if new.kind = 'photo' and n >= 7 then raise exception 'A listing can have at most 7 photos'; end if;
  if new.kind = 'video' and n >= 1 then raise exception 'A listing can have only one video'; end if;
  return new;
end $$;
create trigger media_limits before insert on public.listing_media for each row execute function private.media_limits();

-- A published listing may not drop below 3 photos
create function private.media_floor() returns trigger language plpgsql security definer set search_path = '' as $$
declare n int; st public.listing_status;
begin
  select status into st from public.listings where id = old.listing_id;
  if st = 'active' and old.kind = 'photo' then
    select count(*) into n from public.listing_media where listing_id = old.listing_id and kind = 'photo';
    if n <= 3 then raise exception 'A live listing needs at least 3 photos. Pause it first or add another photo'; end if;
  end if;
  return old;
end $$;
create trigger media_floor before delete on public.listing_media for each row execute function private.media_floor();

-- Duplicate detection (ADR-006). Flags never block publishing.
create function private.flag_duplicates(p_listing uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare l public.listings; loc extensions.geography;
begin
  select * into l from public.listings where id = p_listing;
  if not found then return; end if;

  insert into public.listing_flags (listing_id, kind, detail)
  select distinct l.id, 'duplicate_photo',
         jsonb_build_object('matches_listing', o.listing_id, 'distance', bit_count((a.phash # o.phash)::bit(64)))
  from public.listing_media a
  join public.listing_media o on o.phash is not null and o.listing_id <> a.listing_id
       and bit_count((a.phash # o.phash)::bit(64)) <= 6
  join public.listings ol on ol.id = o.listing_id and ol.owner_id <> l.owner_id
  where a.listing_id = l.id and a.phash is not null
    and not exists (select 1 from public.listing_flags f where f.listing_id = l.id and f.kind = 'duplicate_photo'
                    and f.detail ->> 'matches_listing' = o.listing_id::text and f.status = 'open');

  select location into loc from public.properties where id = l.property_id;
  insert into public.listing_flags (listing_id, kind, detail)
  select l.id, 'duplicate_location', jsonb_build_object('matches_listing', ol.id)
  from public.listings ol
  join public.properties op on op.id = ol.property_id
  where ol.id <> l.id and ol.owner_id <> l.owner_id and ol.status = 'active'
    and ol.bedrooms = l.bedrooms and abs(ol.rent - l.rent) <= l.rent * 0.15
    and extensions.st_dwithin(op.location, loc, 50)
    and not exists (select 1 from public.listing_flags f where f.listing_id = l.id and f.kind = 'duplicate_location'
                    and f.detail ->> 'matches_listing' = ol.id::text and f.status = 'open');
end $$;

-- Callable by the owner or delegate after media upload
create function public.check_listing_duplicates(p_listing uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from public.listings where id = p_listing) then return; end if;  -- RLS: caller must see it
  perform private.flag_duplicates(p_listing);
end $$;

-- Expiry job (daily). Reminders at day 75 and 85 are queued by the notification outbox in Step 12.
create function private.expire_listings() returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  update public.listings set status = 'expired' where status = 'active' and expires_at <= now();
  get diagnostics n = row_count;
  return n;
end $$;

-- ───────── Row-level security ─────────
alter table public.property_types enable row level security;
alter table public.amenities enable row level security;
alter table public.properties enable row level security;
alter table public.listings enable row level security;
alter table public.listing_amenities enable row level security;
alter table public.listing_media enable row level security;
alter table public.listing_flags enable row level security;
alter table public.favourites enable row level security;

create policy ref_read on public.property_types for select to anon, authenticated using (true);
create policy ref_read on public.amenities for select to anon, authenticated using (true);
create policy ref_write on public.property_types for all to authenticated
  using ((select private.has_permission('data.manage'))) with check ((select private.has_permission('data.manage')));
create policy ref_write on public.amenities for all to authenticated
  using ((select private.has_permission('data.manage'))) with check ((select private.has_permission('data.manage')));

-- Listings: public only when active and not expired. Owners, their delegates and moderators also see the rest.
create policy listings_select on public.listings for select to anon, authenticated using (
  (status = 'active' and expires_at > now())
  or owner_id = (select auth.uid()) or created_by = (select auth.uid())
  or (select private.is_delegate_of(owner_id))
  or (select private.has_permission('listing.takedown'))
);
create policy listings_insert on public.listings for insert to authenticated with check (
  created_by = (select auth.uid())
  and status in ('draft', 'pending_owner_approval')
  and (
    (owner_id = (select auth.uid()) and (select private.has_role((select auth.uid()), 'landlord')))
    or (select private.is_delegate_of(owner_id))
  )
);
create policy listings_update on public.listings for update to authenticated
  using (owner_id = (select auth.uid()) or (select private.is_delegate_of(owner_id)) or (select private.has_permission('listing.takedown')))
  with check (owner_id = (select auth.uid()) or (select private.is_delegate_of(owner_id)) or (select private.has_permission('listing.takedown')));
create policy listings_delete on public.listings for delete to authenticated
  using (owner_id = (select auth.uid()) and status in ('draft', 'paused', 'unavailable', 'expired', 'rented'));

-- Properties follow their listings
create policy properties_select on public.properties for select to anon, authenticated using (
  owner_id = (select auth.uid()) or created_by = (select auth.uid()) or (select private.is_delegate_of(owner_id))
  or (select private.has_permission('listing.takedown'))
  or exists (select 1 from public.listings l where l.property_id = properties.id)
);
create policy properties_insert on public.properties for insert to authenticated with check (
  created_by = (select auth.uid())
  and (owner_id = (select auth.uid()) or (select private.is_delegate_of(owner_id)))
);
create policy properties_update on public.properties for update to authenticated
  using (owner_id = (select auth.uid()) or (select private.is_delegate_of(owner_id)))
  with check (owner_id = (select auth.uid()) or (select private.is_delegate_of(owner_id)));
create policy properties_delete on public.properties for delete to authenticated using (owner_id = (select auth.uid()));

-- Children: readable when the listing is readable, writable by owner or delegate
create policy la_select on public.listing_amenities for select to anon, authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id));
create policy la_write on public.listing_amenities for all to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and (l.owner_id = (select auth.uid()) or (select private.is_delegate_of(l.owner_id)))))
  with check (exists (select 1 from public.listings l where l.id = listing_id and (l.owner_id = (select auth.uid()) or (select private.is_delegate_of(l.owner_id)))));

create policy lm_select on public.listing_media for select to anon, authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id));
create policy lm_write on public.listing_media for all to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and (l.owner_id = (select auth.uid()) or (select private.is_delegate_of(l.owner_id)))))
  with check (created_by = (select auth.uid()) and exists (select 1 from public.listings l where l.id = listing_id and (l.owner_id = (select auth.uid()) or (select private.is_delegate_of(l.owner_id)))));

-- Flags: moderators only
create policy flags_select on public.listing_flags for select to authenticated using ((select private.has_permission('listing.takedown')));
create policy flags_update on public.listing_flags for update to authenticated
  using ((select private.has_permission('listing.takedown'))) with check ((select private.has_permission('listing.takedown')));

create policy fav_own on public.favourites for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ───────── Storage: public bucket for listing media (path: {uploader_uid}/{listing_id}/{file}) ─────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-media', 'listing-media', true, 52428800,
        array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
                               allowed_mime_types = excluded.allowed_mime_types;

create policy "listing media insert own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "listing media read own folder" on storage.objects for select to authenticated
  using (bucket_id = 'listing-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "listing media delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'listing-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ───────── Search (ADR-004): one function, filter object in ─────────
create function public.search_listings(filters jsonb default '{}')
returns table (
  id uuid, slug text, title text, rent integer, deposit integer, bedrooms smallint, bathrooms smallint,
  property_type text, county text, county_slug text, sub_county text, estate text,
  lat double precision, lng double precision, cover_path text, units_available smallint,
  published_at timestamptz, managed_by_caretaker boolean, distance_m double precision, total_count bigint
)
language plpgsql stable security invoker set search_path = public, extensions as $$
#variable_conflict use_column
declare
  v_county text := nullif(filters ->> 'county', '');
  v_sub text := nullif(filters ->> 'sub_county', '');
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
         pt.name, c.name, c.slug, p.sub_county, p.estate,
         p.lat, p.lng,
         (select m.path_960 from public.listing_media m where m.listing_id = l.id and m.kind = 'photo' order by m.position, m.created_at limit 1),
         l.units_available, l.published_at, (l.created_by <> l.owner_id),
         case when v_pt is null then null else st_distance(p.location, v_pt) end,
         count(*) over ()
  from public.listings l
  join public.properties p on p.id = l.property_id
  join public.counties c on c.id = p.county_id
  join public.property_types pt on pt.id = l.property_type_id
  where l.status = 'active' and l.expires_at > now()
    and (v_county is null or c.slug = v_county)
    and (v_sub is null or p.sub_county ilike '%' || v_sub || '%')
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
-- Verified-only, minimum rating, water, power and road reliability filters arrive with Steps 5, 10 and 13,
-- when their tables exist. Adding them later is a change to this one function.

-- ───────── Seed lists ─────────
insert into public.property_types (slug, name, sort) values
  ('single-room', 'Single room', 1), ('bedsitter', 'Bedsitter', 2), ('studio', 'Studio', 3),
  ('1-bedroom', '1 bedroom', 4), ('2-bedroom', '2 bedroom', 5), ('3-bedroom', '3 bedroom', 6), ('4-plus-bedroom', '4+ bedroom', 7),
  ('maisonette', 'Maisonette', 8), ('bungalow', 'Bungalow', 9), ('apartment', 'Apartment', 10), ('townhouse', 'Townhouse', 11),
  ('shared-housing', 'Shared housing', 12), ('hostel', 'Hostel', 13), ('student-housing', 'Student housing', 14),
  ('servant-quarter', 'Servant quarter', 15), ('commercial-space', 'Commercial space', 16), ('office', 'Office', 17), ('shop', 'Shop', 18);

insert into public.amenities (slug, name, category) values
  ('water', 'Water', 'utilities'), ('water-24-7', '24/7 water', 'utilities'), ('borehole', 'Borehole', 'utilities'),
  ('kplc-prepaid', 'KPLC prepaid electricity', 'utilities'), ('backup-generator', 'Backup generator', 'utilities'),
  ('parking', 'Parking', 'building'), ('security', 'Security', 'safety'), ('cctv', 'CCTV', 'safety'), ('guard', 'Guard', 'safety'),
  ('gated-compound', 'Gated compound', 'safety'), ('wifi', 'WiFi', 'connectivity'), ('dstv-ready', 'DStv-ready', 'connectivity'),
  ('balcony', 'Balcony', 'building'), ('lift', 'Lift', 'building'), ('furnished', 'Furnished', 'inside'),
  ('pets-allowed', 'Pets allowed', 'rules'), ('childrens-playground', 'Children''s playground', 'family'),
  ('garden-space', 'Space to grow herbs and vegetables', 'family');

-- ───────── Daily expiry job (pg_cron). Enable the extension in Dashboard > Database > Extensions if this errors. ─────────
do $$ begin
  create extension if not exists pg_cron with schema pg_catalog;
  perform cron.schedule('expire-listings', '0 1 * * *', 'select private.expire_listings()');
exception when others then
  raise notice 'pg_cron not scheduled (enable it in Database > Extensions, then run the cron.schedule line): %', sqlerrm;
end $$;
