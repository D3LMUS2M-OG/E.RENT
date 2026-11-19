-- Step 13: neighbourhood information and estate reliability (water, power, road access, security), plus student mode on.

-- ───────── Neighbourhood places entered by landlords ─────────
create table public.neighbourhood_places (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  kind text not null check (kind in ('school', 'hospital', 'stage', 'shopping', 'worship', 'other')),
  name text not null check (char_length(name) between 2 and 80),
  walk_minutes smallint check (walk_minutes is null or walk_minutes between 1 and 120),
  created_at timestamptz not null default now()
);
create index on public.neighbourhood_places (property_id);
alter table public.neighbourhood_places enable row level security;
create policy places_read on public.neighbourhood_places for select to anon, authenticated using (true);
create policy places_write on public.neighbourhood_places for all to authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and (p.owner_id = (select auth.uid()) or private.is_delegate_of(p.owner_id))))
  with check (exists (select 1 from public.properties p where p.id = property_id and (p.owner_id = (select auth.uid()) or private.is_delegate_of(p.owner_id))));
create function private.limit_places() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.neighbourhood_places where property_id = new.property_id) >= 15 then raise exception 'You can add up to 15 places'; end if;
  return new;
end $$;
create trigger limit_places before insert on public.neighbourhood_places for each row execute function private.limit_places();

-- ───────── Two more things tenants can rate: power and road access ─────────
alter table public.reviews add column r_power smallint check (r_power between 1 and 5), add column r_road smallint check (r_road between 1 and 5);

drop function public.submit_review(uuid, int, int, int, int, int, int, int, text);
create function public.submit_review(
  p_request_id uuid, p_overall int, p_condition int, p_accuracy int, p_responsiveness int, p_water int, p_security int, p_neighbourhood int, p_power int, p_road int, p_body text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_listing uuid; v_rental uuid; v_tour uuid; v_owner uuid; v_new uuid; v_kind text; v_last timestamptz;
begin
  if v_me is null then raise exception 'Sign in first'; end if;
  select r.listing_id into v_listing from public.rental_requests r where r.id = p_request_id and r.tenant_id = v_me;
  if not found then raise exception 'That request is not yours'; end if;
  select x.id into v_rental from public.rentals x where x.request_id = p_request_id and x.status = 'confirmed' order by x.created_at desc limit 1;
  select t.id into v_tour from public.tours t where t.request_id = p_request_id;
  if v_rental is null and v_tour is null then
    raise exception 'You can review a house after a confirmed rental or a completed viewing';
  end if;
  select max(v.created_at) into v_last from public.reviews v
   where (v_rental is not null and v.rental_id = v_rental) or (v_tour is not null and v.tour_id = v_tour);
  if v_last is not null and v_last > now() - interval '7 days' then
    raise exception 'You can post an update 7 days after your last review';
  end if;
  select l.owner_id into v_owner from public.listings l where l.id = v_listing;
  v_kind := case when v_rental is not null then 'rental' else 'tour' end;
  insert into public.reviews (listing_id, landlord_id, author_id, rental_id, tour_id, kind, overall, r_condition, r_accuracy, r_responsiveness, r_water, r_security, r_neighbourhood, r_power, r_road, body)
  values (v_listing, v_owner, v_me, case when v_kind = 'rental' then v_rental end, case when v_kind = 'tour' then v_tour end, v_kind,
          p_overall, p_condition, p_accuracy, p_responsiveness, p_water, p_security, p_neighbourhood, p_power, p_road, btrim(p_body))
  returning id into v_new;
  return v_new;
end $$;
revoke all on function public.submit_review(uuid, int, int, int, int, int, int, int, int, int, text) from public, anon;
grant execute on function public.submit_review(uuid, int, int, int, int, int, int, int, int, int, text) to authenticated;

create or replace view public.public_reviews with (security_invoker = false) as
select r.id, r.listing_id, l.title as listing_title, l.slug as listing_slug, r.landlord_id, r.kind,
       r.overall, r.r_condition, r.r_accuracy, r.r_responsiveness, r.r_water, r.r_security, r.r_neighbourhood, r.body, r.created_at,
       case when btrim(coalesce(p.full_name, '')) = '' then 'A tenant'
            when position(' ' in btrim(p.full_name)) > 0 then split_part(btrim(p.full_name), ' ', 1) || ' ' || left(split_part(btrim(p.full_name), ' ', 2), 1) || '.'
            else btrim(p.full_name) end as author_name,
       p.avatar_url as author_avatar,
       rp.body as reply_body, rp.updated_at as reply_at,
       coalesce((select array_agg(ph.path order by ph.created_at) from public.review_photos ph where ph.review_id = r.id), '{}') as photos,
       (row_number() over (partition by coalesce(r.rental_id, r.tour_id) order by r.created_at) > 1) as follow_up,
       (row_number() over (partition by coalesce(r.rental_id, r.tour_id) order by r.created_at desc) = 1) as is_latest,
       r.r_power, r.r_road
from public.reviews r
join public.listings l on l.id = r.listing_id
left join public.profiles p on p.id = r.author_id
left join public.review_replies rp on rp.review_id = r.id;


-- ───────── Area reliability: what tenants say about water, power, roads and security around a listing ─────────
-- Uses each tenant's latest review of a stay, widens from the estate to the sub-county to the county, and needs at least 3 reviews.
create function public.area_reliability(p_listing uuid)
returns table (scope text, area text, n integer, water numeric, power numeric, road numeric, security numeric)
language plpgsql stable security definer set search_path = '' as $$
declare
  l record; sc text; v_n integer; v_w numeric; v_p numeric; v_r numeric; v_s numeric; v_area text;
begin
  select p.county_id, p.sub_county, p.estate, c.name as county into l
    from public.listings li join public.properties p on p.id = li.property_id join public.counties c on c.id = p.county_id
   where li.id = p_listing and li.status = 'active' and li.expires_at > now();
  if not found then return; end if;
  foreach sc in array array['estate', 'sub_county', 'county'] loop
    if sc = 'estate' and nullif(btrim(l.estate), '') is null then continue; end if;
    if sc = 'sub_county' and nullif(btrim(l.sub_county), '') is null then continue; end if;
    select count(*)::int, avg(z.r_water), avg(z.r_power), avg(z.r_road), avg(z.r_security) into v_n, v_w, v_p, v_r, v_s
      from (select distinct on (coalesce(r.rental_id, r.tour_id)) r.* from public.reviews r order by coalesce(r.rental_id, r.tour_id), r.created_at desc) z
      join public.listings x on x.id = z.listing_id join public.properties q on q.id = x.property_id
     where q.county_id = l.county_id
       and (sc = 'county' or (sc = 'sub_county' and lower(q.sub_county) = lower(l.sub_county)) or (sc = 'estate' and lower(q.estate) = lower(l.estate)));
    if v_n >= 3 and coalesce(v_w, v_p, v_r, v_s) is not null then
      v_area := case sc when 'estate' then l.estate when 'sub_county' then l.sub_county else l.county end;
      return query select sc, v_area, v_n, round(v_w, 1), round(v_p, 1), round(v_r, 1), round(v_s, 1);
      return;
    end if;
  end loop;
end $$;
revoke all on function public.area_reliability(uuid) from public;
grant execute on function public.area_reliability(uuid) to anon, authenticated;

-- Student housing mode is on by default now; switch it off in Admin, Settings if you want.
update public.app_settings set value = 'true'::jsonb where key = 'enable_student_mode';
