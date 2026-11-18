-- Step 8: rental flow without payments (RNT-1 to RNT-4).
-- Request to View / Apply to Rent, landlord accepts or declines, viewing record, landlord confirms + tenant accepts.

create type public.request_kind as enum ('view', 'apply');
create type public.request_status as enum ('pending', 'accepted', 'declined', 'cancelled');
create type public.rental_status as enum ('proposed', 'confirmed', 'cancelled');

create function private.owns_listing(lid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.listings l where l.id = lid
    and (l.owner_id = (select auth.uid()) or private.is_delegate_of(l.owner_id)));
$$;

-- ───────── Requests ─────────
create table public.rental_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  tenant_id uuid not null references auth.users(id) on delete cascade,
  kind public.request_kind not null,
  message text not null default '' check (char_length(message) <= 1000),
  preferred_date date,
  occupants smallint not null default 1 check (occupants between 1 and 20),
  status public.request_status not null default 'pending',
  decision_note text check (char_length(decision_note) <= 500),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index rental_requests_open_uniq on public.rental_requests (listing_id, tenant_id, kind) where status in ('pending', 'accepted');
create index on public.rental_requests (tenant_id, created_at desc);
create index on public.rental_requests (listing_id, status);

create function private.request_rules() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := (select auth.uid());
  l record;
begin
  if tg_op = 'INSERT' then
    select owner_id, created_by, status, expires_at, units_available into l from public.listings where id = new.listing_id;
    if not found or l.status <> 'active' or l.expires_at <= now() then raise exception 'This house is no longer available'; end if;
    if l.units_available < 1 then raise exception 'No units are available in this listing'; end if;
    if actor is not null then
      if new.tenant_id <> actor then raise exception 'You can only send requests as yourself'; end if;
      if actor in (l.owner_id, l.created_by) or private.is_delegate_of(l.owner_id) then raise exception 'You cannot send a request to your own listing'; end if;
      if (select count(*) from public.rental_requests where tenant_id = actor and created_at > now() - interval '24 hours') >= 10 then
        raise exception 'You have sent many requests today. Wait for replies before sending more';
      end if;
    end if;
    if new.preferred_date is not null and new.preferred_date < current_date then raise exception 'Pick a date that is not in the past'; end if;
    new.status := 'pending'; new.decision_note := null; new.decided_at := null;
    return new;
  end if;

  if actor is null then return new; end if;
  new.updated_at := now();
  new.tenant_id := old.tenant_id; new.listing_id := old.listing_id; new.kind := old.kind;
  new.message := old.message; new.preferred_date := old.preferred_date; new.occupants := old.occupants;

  if new.status is not distinct from old.status then new.decision_note := old.decision_note; new.decided_at := old.decided_at; return new; end if;

  if actor = old.tenant_id then
    if new.status <> 'cancelled' or old.status not in ('pending', 'accepted') then raise exception 'You can only cancel your own open request'; end if;
    new.decision_note := old.decision_note; new.decided_at := old.decided_at;
  elsif private.owns_listing(old.listing_id) then
    if old.status <> 'pending' or new.status not in ('accepted', 'declined') then raise exception 'Only a pending request can be accepted or declined'; end if;
    new.decided_at := now();
  else
    raise exception 'Not allowed';
  end if;
  return new;
end $$;
create trigger request_rules before insert or update on public.rental_requests for each row execute function private.request_rules();

-- ───────── Viewing record (unlocks the tour review in Step 10) ─────────
create table public.tours (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.rental_requests(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  tenant_id uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now()
);
create index on public.tours (listing_id);
create index on public.tours (tenant_id);

-- ───────── Rentals: landlord confirms, tenant accepts ─────────
create table public.rentals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  tenant_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null references public.rental_requests(id),
  status public.rental_status not null default 'proposed',
  landlord_confirmed_at timestamptz not null default now(),
  tenant_accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index rentals_open_uniq on public.rentals (listing_id, tenant_id) where status <> 'cancelled';
create index on public.rentals (tenant_id);
create index on public.rentals (request_id);

create function private.rental_rules() returns trigger language plpgsql security definer set search_path = '' as $$
declare actor uuid := (select auth.uid()); l record; r record;
begin
  if tg_op = 'INSERT' then
    select owner_id, units_available, status into l from public.listings where id = new.listing_id;
    if not found then raise exception 'Listing not found'; end if;
    if actor is not null and actor <> l.owner_id then raise exception 'Only the landlord can confirm a rental'; end if;
    if l.units_available < 1 then raise exception 'No units are available'; end if;
    select tenant_id, listing_id, status into r from public.rental_requests where id = new.request_id;
    if not found or r.status <> 'accepted' or r.tenant_id <> new.tenant_id or r.listing_id <> new.listing_id then
      raise exception 'Accept the tenant''s request before confirming a rental';
    end if;
    new.status := 'proposed'; new.landlord_confirmed_at := now(); new.tenant_accepted_at := null;
    return new;
  end if;

  if actor is null then return new; end if;
  new.tenant_id := old.tenant_id; new.listing_id := old.listing_id; new.request_id := old.request_id;
  new.landlord_confirmed_at := old.landlord_confirmed_at;
  if new.status is not distinct from old.status then new.tenant_accepted_at := old.tenant_accepted_at; return new; end if;
  if old.status <> 'proposed' then raise exception 'A confirmed or cancelled rental cannot change. Contact support'; end if;

  if new.status = 'confirmed' then
    if actor <> old.tenant_id then raise exception 'Only the tenant can accept'; end if;
    new.tenant_accepted_at := now();
  elsif new.status = 'cancelled' then
    if actor <> old.tenant_id and not exists (select 1 from public.listings where id = old.listing_id and owner_id = actor) then raise exception 'Not allowed'; end if;
    new.tenant_accepted_at := null;
  else
    raise exception 'That change is not allowed';
  end if;
  return new;
end $$;
create trigger rental_rules before insert or update on public.rentals for each row execute function private.rental_rules();

-- A confirmed rental takes one unit. At zero units the listing becomes Rented.
create function private.rental_confirmed() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'confirmed' and old.status = 'proposed' then
    update public.listings set units_available = greatest(units_available - 1, 0),
           status = case when units_available - 1 <= 0 and status = 'active' then 'rented'::public.listing_status else status end
    where id = new.listing_id;
  end if;
  return new;
end $$;
create trigger rental_confirmed after update on public.rentals for each row execute function private.rental_confirmed();

-- ───────── Row-level security ─────────
alter table public.rental_requests enable row level security;
alter table public.tours enable row level security;
alter table public.rentals enable row level security;

create policy req_select on public.rental_requests for select to authenticated
  using (tenant_id = (select auth.uid()) or (select private.owns_listing(listing_id)));
create policy req_insert on public.rental_requests for insert to authenticated with check (tenant_id = (select auth.uid()));
create policy req_update on public.rental_requests for update to authenticated
  using (tenant_id = (select auth.uid()) or (select private.owns_listing(listing_id)))
  with check (tenant_id = (select auth.uid()) or (select private.owns_listing(listing_id)));

create policy tour_select on public.tours for select to authenticated
  using (tenant_id = (select auth.uid()) or (select private.owns_listing(listing_id)));
create policy tour_insert on public.tours for insert to authenticated with check (
  tenant_id = (select auth.uid()) and exists (
    select 1 from public.rental_requests r where r.id = request_id and r.tenant_id = (select auth.uid())
      and r.listing_id = tours.listing_id and r.kind = 'view' and r.status = 'accepted'));

create policy rental_select on public.rentals for select to authenticated
  using (tenant_id = (select auth.uid()) or (select private.owns_listing(listing_id)));
create policy rental_insert on public.rentals for insert to authenticated
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = (select auth.uid())));
create policy rental_update on public.rentals for update to authenticated
  using (tenant_id = (select auth.uid()) or exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = (select auth.uid())))
  with check (tenant_id = (select auth.uid()) or exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = (select auth.uid())));

-- ───────── Joined views for the two inboxes (names and listing titles are not readable through plain RLS) ─────────
create function public.incoming_requests() returns table (
  id uuid, listing_id uuid, listing_title text, listing_slug text, tenant_id uuid, tenant_name text, kind text, message text,
  preferred_date date, occupants smallint, status text, decision_note text, created_at timestamptz,
  rental_id uuid, rental_status text, tour_done boolean, is_owner boolean)
language sql stable security definer set search_path = '' as $$
  select r.id, r.listing_id, l.title, l.slug, r.tenant_id, p.full_name, r.kind::text, r.message, r.preferred_date, r.occupants,
         r.status::text, r.decision_note, r.created_at,
         ren.id, ren.status::text, exists (select 1 from public.tours t where t.request_id = r.id), l.owner_id = (select auth.uid())
  from public.rental_requests r
  join public.listings l on l.id = r.listing_id
  join public.profiles p on p.id = r.tenant_id
  left join lateral (select x.id, x.status from public.rentals x where x.request_id = r.id order by x.created_at desc limit 1) ren on true
  where l.owner_id = (select auth.uid()) or private.is_delegate_of(l.owner_id)
  order by r.created_at desc limit 200;
$$;

create function public.my_requests() returns table (
  id uuid, listing_id uuid, listing_title text, listing_slug text, rent integer, kind text, message text, preferred_date date,
  occupants smallint, status text, decision_note text, created_at timestamptz, rental_id uuid, rental_status text, tour_done boolean)
language sql stable security definer set search_path = '' as $$
  select r.id, r.listing_id, l.title, l.slug, l.rent, r.kind::text, r.message, r.preferred_date, r.occupants, r.status::text,
         r.decision_note, r.created_at, ren.id, ren.status::text, exists (select 1 from public.tours t where t.request_id = r.id)
  from public.rental_requests r
  join public.listings l on l.id = r.listing_id
  left join lateral (select x.id, x.status from public.rentals x where x.request_id = r.id order by x.created_at desc limit 1) ren on true
  where r.tenant_id = (select auth.uid())
  order by r.created_at desc limit 200;
$$;
revoke all on function public.incoming_requests(), public.my_requests() from public, anon;
grant execute on function public.incoming_requests(), public.my_requests() to authenticated;
