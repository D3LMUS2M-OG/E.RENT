-- Review photos fix, and follow-up reviews.

-- 1. Photos: the old insert policy counted every photo on the platform (a shadowed column name), so inserts stopped after a few photos.
drop policy review_photos_insert on public.review_photos;
create policy review_photos_insert on public.review_photos for insert to authenticated with check (
  exists (select 1 from public.reviews r where r.id = review_photos.review_id and r.author_id = (select auth.uid()))
  and (select count(*) from public.review_photos x where x.review_id = review_photos.review_id) < 3);

-- 2. A tenant can post another review for the same stay later (for example after the landlord fixes something).
alter table public.reviews drop constraint if exists reviews_rental_id_key;
alter table public.reviews drop constraint if exists reviews_tour_id_key;
create index if not exists reviews_rental_idx on public.reviews (rental_id);
create index if not exists reviews_tour_idx on public.reviews (tour_id);

create or replace function public.submit_review(
  p_request_id uuid, p_overall int, p_condition int, p_accuracy int, p_responsiveness int, p_water int, p_security int, p_neighbourhood int, p_body text
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
  insert into public.reviews (listing_id, landlord_id, author_id, rental_id, tour_id, kind, overall, r_condition, r_accuracy, r_responsiveness, r_water, r_security, r_neighbourhood, body)
  values (v_listing, v_owner, v_me, case when v_kind = 'rental' then v_rental end, case when v_kind = 'tour' then v_tour end, v_kind,
          p_overall, p_condition, p_accuracy, p_responsiveness, p_water, p_security, p_neighbourhood, btrim(p_body))
  returning id into v_new;
  return v_new;
end $$;

drop function public.my_reviewable();
create function public.my_reviewable() returns table (request_id uuid, kind text, listing_slug text, listing_title text, reviewed boolean, last_reviewed_at timestamptz, can_review boolean)
language sql stable security definer set search_path = '' as $$
  select q.id, q.kind, q.slug, q.title, q.last is not null, q.last, (q.last is null or q.last < now() - interval '7 days')
  from (
    select r.id, case when ren.id is not null then 'rental' else 'tour' end as kind, l.slug, l.title,
           (select max(v.created_at) from public.reviews v where (ren.id is not null and v.rental_id = ren.id) or (t.id is not null and v.tour_id = t.id)) as last
    from public.rental_requests r
    join public.listings l on l.id = r.listing_id
    left join lateral (select x.id from public.rentals x where x.request_id = r.id and x.status = 'confirmed' order by x.created_at desc limit 1) ren on true
    left join public.tours t on t.request_id = r.id
    where r.tenant_id = (select auth.uid()) and (ren.id is not null or t.id is not null)
  ) q;
$$;
revoke all on function public.my_reviewable() from public, anon;
grant execute on function public.my_reviewable() to authenticated;

-- 3. Averages use each tenant's latest review of a stay, so an update replaces the older score instead of counting twice. All reviews stay visible as history.
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
       (row_number() over (partition by coalesce(r.rental_id, r.tour_id) order by r.created_at desc) = 1) as is_latest
from public.reviews r
join public.listings l on l.id = r.listing_id
left join public.profiles p on p.id = r.author_id
left join public.review_replies rp on rp.review_id = r.id;

create or replace view public.landlord_ratings with (security_invoker = false) as
select landlord_id, count(*)::int as review_count, round(avg(overall), 2) as avg_overall,
       round(avg(r_condition), 1) as avg_condition, round(avg(r_accuracy), 1) as avg_accuracy, round(avg(r_responsiveness), 1) as avg_responsiveness,
       round(avg(r_water), 1) as avg_water, round(avg(r_security), 1) as avg_security, round(avg(r_neighbourhood), 1) as avg_neighbourhood
from (select distinct on (coalesce(rental_id, tour_id)) * from public.reviews order by coalesce(rental_id, tour_id), created_at desc) latest
group by landlord_id;

create or replace view public.listing_ratings with (security_invoker = false) as
select listing_id, count(*)::int as review_count, round(avg(overall), 2) as avg_overall
from (select distinct on (coalesce(rental_id, tour_id)) * from public.reviews order by coalesce(rental_id, tour_id), created_at desc) latest
group by listing_id;
