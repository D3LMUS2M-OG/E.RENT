-- Step 10: reviews and ratings. A review needs a confirmed rental or a recorded viewing, one review each, public landlord replies.

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  landlord_id uuid not null references auth.users(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  rental_id uuid unique references public.rentals(id) on delete cascade,
  tour_id uuid unique references public.tours(id) on delete cascade,
  kind text not null check (kind in ('rental', 'tour')),
  overall smallint not null check (overall between 1 and 5),
  r_condition smallint check (r_condition between 1 and 5),
  r_accuracy smallint check (r_accuracy between 1 and 5),
  r_responsiveness smallint check (r_responsiveness between 1 and 5),
  r_water smallint check (r_water between 1 and 5),
  r_security smallint check (r_security between 1 and 5),
  r_neighbourhood smallint check (r_neighbourhood between 1 and 5),
  body text not null check (char_length(body) between 10 and 2000),
  created_at timestamptz not null default now(),
  constraint review_source check ((kind = 'rental' and rental_id is not null and tour_id is null) or (kind = 'tour' and tour_id is not null and rental_id is null))
);
create index on public.reviews (listing_id, created_at desc);
create index on public.reviews (landlord_id, created_at desc);
create index on public.reviews (author_id);
alter table public.reviews enable row level security;
-- Everyone can read reviews. Nobody inserts or edits directly: reviews are created by submit_review(), which checks eligibility.
create policy reviews_read on public.reviews for select to anon, authenticated using (true);
-- Staff can remove a review (the proof of abuse is handled outside the app)
create policy reviews_staff_delete on public.reviews for delete to authenticated using ((select private.has_permission('review.delete')));

create table public.review_photos (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  path text not null check (char_length(path) <= 300),
  created_at timestamptz not null default now()
);
create index on public.review_photos (review_id);
alter table public.review_photos enable row level security;
create policy review_photos_read on public.review_photos for select to anon, authenticated using (true);
create policy review_photos_insert on public.review_photos for insert to authenticated with check (
  exists (select 1 from public.reviews r where r.id = review_id and r.author_id = (select auth.uid()))
  and (select count(*) from public.review_photos x where x.review_id = review_id) < 3);

create table public.review_replies (
  review_id uuid primary key references public.reviews(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.review_replies enable row level security;
create policy review_replies_read on public.review_replies for select to anon, authenticated using (true);

-- Review photos: public bucket, each person writes inside their own folder
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-photos', 'review-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy "review photos insert own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'review-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "review photos delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'review-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ───────── Submitting a review ─────────
create function public.submit_review(
  p_request_id uuid, p_overall int, p_condition int, p_accuracy int, p_responsiveness int, p_water int, p_security int, p_neighbourhood int, p_body text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_listing uuid; v_rental uuid; v_tour uuid; v_owner uuid; v_new uuid; v_kind text;
begin
  if v_me is null then raise exception 'Sign in first'; end if;
  select r.listing_id into v_listing from public.rental_requests r where r.id = p_request_id and r.tenant_id = v_me;
  if not found then raise exception 'That request is not yours'; end if;
  select x.id into v_rental from public.rentals x where x.request_id = p_request_id and x.status = 'confirmed' order by x.created_at desc limit 1;
  select t.id into v_tour from public.tours t where t.request_id = p_request_id;
  if v_rental is null and v_tour is null then
    raise exception 'You can review a house after a confirmed rental or a completed viewing';
  end if;
  if exists (select 1 from public.reviews v where (v_rental is not null and v.rental_id = v_rental) or (v_tour is not null and v.tour_id = v_tour)) then
    raise exception 'You have already reviewed this house';
  end if;
  select l.owner_id into v_owner from public.listings l where l.id = v_listing;
  v_kind := case when v_rental is not null then 'rental' else 'tour' end;
  insert into public.reviews (listing_id, landlord_id, author_id, rental_id, tour_id, kind, overall, r_condition, r_accuracy, r_responsiveness, r_water, r_security, r_neighbourhood, body)
  values (v_listing, v_owner, v_me, case when v_kind = 'rental' then v_rental end, case when v_kind = 'tour' then v_tour end, v_kind,
          p_overall, p_condition, p_accuracy, p_responsiveness, p_water, p_security, p_neighbourhood, btrim(p_body))
  returning id into v_new;
  return v_new;
end $$;
revoke all on function public.submit_review(uuid, int, int, int, int, int, int, int, text) from public, anon;
grant execute on function public.submit_review(uuid, int, int, int, int, int, int, int, text) to authenticated;

-- What can I review, and have I?
create function public.my_reviewable() returns table (request_id uuid, kind text, listing_slug text, listing_title text, reviewed boolean)
language sql stable security definer set search_path = '' as $$
  select r.id,
         case when ren.id is not null then 'rental' else 'tour' end,
         l.slug, l.title,
         exists (select 1 from public.reviews v where (ren.id is not null and v.rental_id = ren.id) or (t.id is not null and v.tour_id = t.id))
  from public.rental_requests r
  join public.listings l on l.id = r.listing_id
  left join lateral (select x.id from public.rentals x where x.request_id = r.id and x.status = 'confirmed' order by x.created_at desc limit 1) ren on true
  left join public.tours t on t.request_id = r.id
  where r.tenant_id = (select auth.uid()) and (ren.id is not null or t.id is not null);
$$;
revoke all on function public.my_reviewable() from public, anon;
grant execute on function public.my_reviewable() to authenticated;

-- ───────── Landlord replies (owner, or a delegate acting for them) ─────────
create function public.reply_to_review(p_review_id uuid, p_body text) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); owner uuid;
begin
  if me is null then raise exception 'Sign in first'; end if;
  select landlord_id into owner from public.reviews where id = p_review_id;
  if owner is null then raise exception 'Review not found'; end if;
  if me <> owner and not private.is_delegate_of(owner) then raise exception 'Only the landlord can reply'; end if;
  if char_length(btrim(p_body)) not between 1 and 1000 then raise exception 'Write a reply of up to 1000 characters'; end if;
  insert into public.review_replies (review_id, author_id, body) values (p_review_id, me, btrim(p_body))
  on conflict (review_id) do update set body = excluded.body, author_id = excluded.author_id, updated_at = now();
end $$;
revoke all on function public.reply_to_review(uuid, text) from public, anon;
grant execute on function public.reply_to_review(uuid, text) to authenticated;

-- ───────── Public reads: first name and initial only, never the email or phone ─────────
create view public.public_reviews with (security_invoker = false) as
select r.id, r.listing_id, l.title as listing_title, l.slug as listing_slug, r.landlord_id, r.kind,
       r.overall, r.r_condition, r.r_accuracy, r.r_responsiveness, r.r_water, r.r_security, r.r_neighbourhood, r.body, r.created_at,
       case when btrim(coalesce(p.full_name, '')) = '' then 'A tenant'
            when position(' ' in btrim(p.full_name)) > 0 then split_part(btrim(p.full_name), ' ', 1) || ' ' || left(split_part(btrim(p.full_name), ' ', 2), 1) || '.'
            else btrim(p.full_name) end as author_name,
       p.avatar_url as author_avatar,
       rp.body as reply_body, rp.updated_at as reply_at,
       coalesce((select array_agg(ph.path order by ph.created_at) from public.review_photos ph where ph.review_id = r.id), '{}') as photos
from public.reviews r
join public.listings l on l.id = r.listing_id
left join public.profiles p on p.id = r.author_id
left join public.review_replies rp on rp.review_id = r.id;
grant select on public.public_reviews to anon, authenticated;

create view public.landlord_ratings with (security_invoker = false) as
select landlord_id, count(*)::int as review_count, round(avg(overall), 2) as avg_overall,
       round(avg(r_condition), 1) as avg_condition, round(avg(r_accuracy), 1) as avg_accuracy, round(avg(r_responsiveness), 1) as avg_responsiveness,
       round(avg(r_water), 1) as avg_water, round(avg(r_security), 1) as avg_security, round(avg(r_neighbourhood), 1) as avg_neighbourhood
from public.reviews group by landlord_id;
grant select on public.landlord_ratings to anon, authenticated;

create view public.listing_ratings with (security_invoker = false) as
select listing_id, count(*)::int as review_count, round(avg(overall), 2) as avg_overall from public.reviews group by listing_id;
grant select on public.listing_ratings to anon, authenticated;
