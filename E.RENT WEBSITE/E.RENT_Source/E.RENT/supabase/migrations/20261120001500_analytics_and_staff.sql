-- Step 11 (rest): landlord analytics, platform analytics, staff management.

-- ───────── Listing views: one counter per listing per day, no personal data ─────────
create table public.listing_view_counts (
  listing_id uuid not null references public.listings(id) on delete cascade,
  day date not null default current_date,
  views integer not null default 0,
  primary key (listing_id, day)
);
alter table public.listing_view_counts enable row level security;   -- no policies: read through listing_analytics(), written through record_listing_view()
revoke all on public.listing_view_counts from anon, authenticated;

create function public.record_listing_view(p_listing uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.listings l where l.id = p_listing and l.status = 'active') then return; end if;
  insert into public.listing_view_counts as v (listing_id, day, views) values (p_listing, current_date, 1)
  on conflict (listing_id, day) do update set views = v.views + 1;
end $$;
revoke all on function public.record_listing_view(uuid) from public;
grant execute on function public.record_listing_view(uuid) to anon, authenticated;

-- Per-listing numbers for the signed-in landlord (owner or delegate)
create function public.listing_analytics(p_days int default 30) returns table (listing_id uuid, slug text, title text, status public.listing_status, views bigint, chats bigint, saves bigint, requests bigint)
language sql stable security definer set search_path = '' as $$
  select l.id, l.slug, l.title, l.status,
    coalesce((select sum(v.views) from public.listing_view_counts v where v.listing_id = l.id and v.day > current_date - p_days), 0),
    (select count(*) from public.conversations c where c.listing_id = l.id and c.created_at > now() - make_interval(days => p_days)),
    (select count(*) from public.favourites f where f.listing_id = l.id),
    (select count(*) from public.rental_requests r where r.listing_id = l.id and r.created_at > now() - make_interval(days => p_days))
  from public.listings l
  where private.owns_listing(l.id) and l.status <> 'draft'
  order by 5 desc, l.created_at desc;
$$;
revoke all on function public.listing_analytics(int) from public, anon;
grant execute on function public.listing_analytics(int) to authenticated;

create function public.views_by_day(p_days int default 30) returns table (day date, views bigint)
language sql stable security definer set search_path = '' as $$
  select d::date, coalesce(sum(v.views), 0)
  from generate_series(current_date - (p_days - 1), current_date, interval '1 day') d
  left join public.listing_view_counts v on v.day = d::date and private.owns_listing(v.listing_id)
  group by d order by d;
$$;
revoke all on function public.views_by_day(int) from public, anon;
grant execute on function public.views_by_day(int) to authenticated;

-- ───────── Platform analytics for staff ─────────
create function public.platform_stats() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare out jsonb;
begin
  if not private.is_staff() then raise exception 'Staff only'; end if;
  select jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'new_users_30d', (select count(*) from public.profiles where created_at > now() - interval '30 days'),
    'landlords', (select count(*) from public.user_roles where role = 'landlord'),
    'verified_landlords', (select count(*) from public.landlord_verifications where status = 'approved'),
    'listings_by_status', (select coalesce(jsonb_object_agg(status, n), '{}') from (select status, count(*) n from public.listings group by status) s),
    'requests', (select count(*) from public.rental_requests),
    'requests_30d', (select count(*) from public.rental_requests where created_at > now() - interval '30 days'),
    'rentals_confirmed', (select count(*) from public.rentals where status = 'confirmed'),
    'conversations', (select count(*) from public.conversations),
    'reviews', (select count(*) from public.reviews),
    'views_30d', (select coalesce(sum(views), 0) from public.listing_view_counts where day > current_date - 30),
    'users_by_week', (select coalesce(jsonb_agg(jsonb_build_object('week', w, 'n', n) order by w), '[]') from (
        select date_trunc('week', created_at)::date w, count(*) n from public.profiles where created_at > now() - interval '8 weeks' group by 1) x),
    'listings_by_county', (select coalesce(jsonb_agg(jsonb_build_object('county', name, 'n', n) order by n desc), '[]') from (
        select c.name, count(*) n from public.listings l join public.properties p on p.id = l.property_id join public.counties c on c.id = p.county_id
        where l.status = 'active' group by c.name order by n desc limit 15) y)
  ) into out;
  return out;
end $$;
revoke all on function public.platform_stats() from public, anon;
grant execute on function public.platform_stats() to authenticated;

-- ───────── Staff management (super admin only, everything audited) ─────────
create function public.staff_list() returns table (user_id uuid, email text, full_name text, roles text[])
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_super_admin() then raise exception 'Only the super admin can see staff'; end if;
  return query select s.user_id, u.email::text, coalesce(p.full_name, ''), array_agg(s.role order by s.role)
    from public.staff_roles s join auth.users u on u.id = s.user_id left join public.profiles p on p.id = s.user_id group by s.user_id, u.email, p.full_name order by u.email;
end $$;
revoke all on function public.staff_list() from public, anon;
grant execute on function public.staff_list() to authenticated;

create function public.staff_add(p_email text, p_role text) returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  if not private.is_super_admin() then raise exception 'Only the super admin can add staff'; end if;
  if p_role not in ('super_admin', 'moderator', 'verifier', 'support', 'analyst') then raise exception 'Unknown role'; end if;
  select id into v_user from auth.users where lower(email) = lower(btrim(p_email));
  if v_user is null then raise exception 'No account uses that email. They need to sign up first.'; end if;
  insert into public.staff_roles (user_id, role) values (v_user, p_role) on conflict do nothing;
  insert into public.admin_audit_log (actor_id, action, target_type, target_id, metadata) values ((select auth.uid()), 'staff.role_added', 'user', v_user::text, jsonb_build_object('role', p_role));
end $$;
revoke all on function public.staff_add(text, text) from public, anon;
grant execute on function public.staff_add(text, text) to authenticated;

create function public.staff_remove(p_user uuid, p_role text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_super_admin() then raise exception 'Only the super admin can remove staff'; end if;
  if p_role = 'super_admin' and (select count(*) from public.staff_roles where role = 'super_admin') <= 1 then
    raise exception 'There must always be at least one super admin';
  end if;
  delete from public.staff_roles where user_id = p_user and role = p_role;
  insert into public.admin_audit_log (actor_id, action, target_type, target_id, metadata) values ((select auth.uid()), 'staff.role_removed', 'user', p_user::text, jsonb_build_object('role', p_role));
end $$;
revoke all on function public.staff_remove(uuid, text) from public, anon;
grant execute on function public.staff_remove(uuid, text) to authenticated;
