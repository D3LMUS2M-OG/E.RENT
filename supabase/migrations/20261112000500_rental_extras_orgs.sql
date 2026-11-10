-- Rental cancellation, contact-number sharing, organisation accounts (ACC-8).
-- Depends on migrations 1 to 4.

-- ═════════ A. Cancelling a confirmed rental ═════════
alter table public.rentals
  add column cancelled_by uuid references auth.users(id),
  add column cancelled_at timestamptz,
  add column cancel_reason text check (char_length(cancel_reason) <= 500);

create or replace function private.rental_rules() returns trigger language plpgsql security definer set search_path = '' as $$
declare actor uuid := (select auth.uid()); l record; r record; is_owner boolean;
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
    new.cancelled_by := null; new.cancelled_at := null; new.cancel_reason := null;
    return new;
  end if;

  if actor is null then return new; end if;
  new.tenant_id := old.tenant_id; new.listing_id := old.listing_id; new.request_id := old.request_id;
  new.landlord_confirmed_at := old.landlord_confirmed_at;
  if new.status is not distinct from old.status then
    new.tenant_accepted_at := old.tenant_accepted_at; new.cancelled_by := old.cancelled_by;
    new.cancelled_at := old.cancelled_at; new.cancel_reason := old.cancel_reason; return new;
  end if;
  if old.status = 'cancelled' then raise exception 'A cancelled rental cannot change'; end if;
  select exists (select 1 from public.listings where id = old.listing_id and owner_id = actor) into is_owner;

  if new.status = 'confirmed' then
    if old.status <> 'proposed' then raise exception 'That change is not allowed'; end if;
    if actor <> old.tenant_id then raise exception 'Only the tenant can accept'; end if;
    new.tenant_accepted_at := now();
    new.cancelled_by := null; new.cancelled_at := null; new.cancel_reason := null;
  elsif new.status = 'cancelled' then
    if actor <> old.tenant_id and not is_owner then raise exception 'Not allowed'; end if;
    if old.status = 'confirmed' and char_length(trim(coalesce(new.cancel_reason, ''))) < 10 then
      raise exception 'Give a reason of at least 10 characters';
    end if;
    new.tenant_accepted_at := old.tenant_accepted_at;
    new.cancelled_by := actor; new.cancelled_at := now(); new.cancel_reason := nullif(trim(coalesce(new.cancel_reason, '')), '');
  else
    raise exception 'That change is not allowed';
  end if;
  return new;
end $$;

-- Confirmed takes a unit. Cancelling a confirmed rental gives it back and pauses a Rented listing for the landlord to relist.
create or replace function private.rental_confirmed() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'confirmed' and old.status = 'proposed' then
    update public.listings set units_available = greatest(units_available - 1, 0),
           status = case when units_available - 1 <= 0 and status = 'active' then 'rented'::public.listing_status else status end
    where id = new.listing_id;
  elsif new.status = 'cancelled' and old.status = 'confirmed' then
    update public.listings set units_available = least(units_available + 1, units_total),
           status = case when status = 'rented' then 'paused'::public.listing_status else status end
    where id = new.listing_id;
  end if;
  return new;
end $$;

-- ═════════ B. Contact-number sharing ═════════
alter table public.rental_requests add column decided_by uuid references auth.users(id);
update public.rental_requests r set decided_by = l.owner_id from public.listings l
  where l.id = r.listing_id and r.status in ('accepted', 'declined') and r.decided_by is null;

create or replace function private.request_rules() returns trigger language plpgsql security definer set search_path = '' as $$
declare actor uuid := (select auth.uid()); l record;
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
    new.status := 'pending'; new.decision_note := null; new.decided_at := null; new.decided_by := null;
    return new;
  end if;

  if actor is null then return new; end if;
  new.updated_at := now();
  new.tenant_id := old.tenant_id; new.listing_id := old.listing_id; new.kind := old.kind;
  new.message := old.message; new.preferred_date := old.preferred_date; new.occupants := old.occupants;
  new.decided_by := old.decided_by;

  if new.status is not distinct from old.status then new.decision_note := old.decision_note; new.decided_at := old.decided_at; return new; end if;

  if actor = old.tenant_id then
    if new.status <> 'cancelled' or old.status not in ('pending', 'accepted') then raise exception 'You can only cancel your own open request'; end if;
    new.decision_note := old.decision_note; new.decided_at := old.decided_at;
  elsif private.owns_listing(old.listing_id) then
    if old.status <> 'pending' or new.status not in ('accepted', 'declined') then raise exception 'Only a pending request can be accepted or declined'; end if;
    new.decided_at := now(); new.decided_by := actor;
  else
    raise exception 'Not allowed';
  end if;
  return new;
end $$;

alter table public.profiles add constraint profiles_phone_format check (phone is null or phone ~ '^\+254[17][0-9]{8}$');

create type public.share_status as enum ('pending', 'approved', 'declined', 'revoked');
create table public.contact_shares (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.rental_requests(id) on delete cascade,
  grantor_id uuid not null references auth.users(id) on delete cascade,   -- whose number it is
  grantee_id uuid not null references auth.users(id) on delete cascade,   -- who may see it
  status public.share_status not null,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (request_id, grantor_id, grantee_id),
  check (grantor_id <> grantee_id)
);
create index on public.contact_shares (grantor_id);
create index on public.contact_shares (grantee_id);
alter table public.contact_shares enable row level security;
-- Rows are visible to the two people involved. The phone number itself is never in this table.
create policy shares_select on public.contact_shares for select to authenticated
  using (grantor_id = (select auth.uid()) or grantee_id = (select auth.uid()));
-- No insert, update or delete policies: all changes go through set_contact_share().

-- The other person in a request: the tenant and whoever accepted it. Only once the request is accepted.
create function private.contact_counterpart(p_request uuid) returns uuid language plpgsql stable security definer set search_path = '' as $$
declare r record; me uuid := (select auth.uid());
begin
  select tenant_id, decided_by, status into r from public.rental_requests where id = p_request;
  if not found or r.status <> 'accepted' or r.decided_by is null then return null; end if;
  if me = r.tenant_id then return r.decided_by; elsif me = r.decided_by then return r.tenant_id; end if;
  return null;
end $$;

create function public.set_contact_share(p_request uuid, p_action text) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); cp uuid; my_phone text;
begin
  if me is null then raise exception 'Sign in first'; end if;
  cp := private.contact_counterpart(p_request);
  if cp is null then raise exception 'Sharing numbers opens once a request is accepted, between the tenant and the person who replied'; end if;

  if p_action = 'ask' then
    insert into public.contact_shares (request_id, grantor_id, grantee_id, status) values (p_request, cp, me, 'pending')
    on conflict (request_id, grantor_id, grantee_id) do nothing;
  elsif p_action in ('share', 'approve') then
    select phone into my_phone from public.profiles where id = me;
    if my_phone is null then raise exception 'Add your phone number under Account first'; end if;
    insert into public.contact_shares (request_id, grantor_id, grantee_id, status, responded_at) values (p_request, me, cp, 'approved', now())
    on conflict (request_id, grantor_id, grantee_id) do update set status = 'approved', responded_at = now();
  elsif p_action in ('decline', 'revoke') then
    update public.contact_shares set status = case when p_action = 'decline' then 'declined'::public.share_status else 'revoked'::public.share_status end, responded_at = now()
    where request_id = p_request and grantor_id = me and grantee_id = cp;
  else
    raise exception 'Unknown action';
  end if;
end $$;

-- One row per accepted request I am part of. The other person's number appears only after they approved.
create function public.contact_states() returns table (
  request_id uuid, counterpart_name text, theirs_status text, their_phone text, mine_status text, my_phone_set boolean)
language sql stable security definer set search_path = '' as $$
  select r.id, p.full_name, ts.status::text, case when ts.status = 'approved' then p.phone end, ms.status::text,
         (select mp.phone is not null from public.profiles mp where mp.id = (select auth.uid()))
  from public.rental_requests r
  join public.profiles p on p.id = case when r.tenant_id = (select auth.uid()) then r.decided_by else r.tenant_id end
  left join public.contact_shares ts on ts.request_id = r.id and ts.grantor_id = p.id and ts.grantee_id = (select auth.uid())
  left join public.contact_shares ms on ms.request_id = r.id and ms.grantor_id = (select auth.uid()) and ms.grantee_id = p.id
  where r.status = 'accepted' and r.decided_by is not null and ((select auth.uid()) in (r.tenant_id, r.decided_by));
$$;
revoke all on function public.set_contact_share(uuid, text), public.contact_states() from public, anon;
grant execute on function public.set_contact_share(uuid, text), public.contact_states() to authenticated;

-- Inbox functions again, with rental cancellation details
drop function public.incoming_requests();
drop function public.my_requests();
create function public.incoming_requests() returns table (
  id uuid, listing_id uuid, listing_title text, listing_slug text, tenant_id uuid, tenant_name text, kind text, message text,
  preferred_date date, occupants smallint, status text, decision_note text, created_at timestamptz,
  rental_id uuid, rental_status text, tour_done boolean, is_owner boolean, cancel_reason text, cancelled_by_me boolean)
language sql stable security definer set search_path = '' as $$
  select r.id, r.listing_id, l.title, l.slug, r.tenant_id, p.full_name, r.kind::text, r.message, r.preferred_date, r.occupants,
         r.status::text, r.decision_note, r.created_at,
         ren.id, ren.status::text, exists (select 1 from public.tours t where t.request_id = r.id), l.owner_id = (select auth.uid()),
         ren.cancel_reason, ren.cancelled_by = (select auth.uid())
  from public.rental_requests r
  join public.listings l on l.id = r.listing_id
  join public.profiles p on p.id = r.tenant_id
  left join lateral (select x.id, x.status, x.cancel_reason, x.cancelled_by from public.rentals x where x.request_id = r.id order by x.created_at desc limit 1) ren on true
  where l.owner_id = (select auth.uid()) or private.is_delegate_of(l.owner_id)
  order by r.created_at desc limit 200;
$$;
create function public.my_requests() returns table (
  id uuid, listing_id uuid, listing_title text, listing_slug text, rent integer, kind text, message text, preferred_date date,
  occupants smallint, status text, decision_note text, created_at timestamptz, rental_id uuid, rental_status text, tour_done boolean,
  cancel_reason text, cancelled_by_me boolean)
language sql stable security definer set search_path = '' as $$
  select r.id, r.listing_id, l.title, l.slug, l.rent, r.kind::text, r.message, r.preferred_date, r.occupants, r.status::text,
         r.decision_note, r.created_at, ren.id, ren.status::text, exists (select 1 from public.tours t where t.request_id = r.id),
         ren.cancel_reason, ren.cancelled_by = (select auth.uid())
  from public.rental_requests r
  join public.listings l on l.id = r.listing_id
  left join lateral (select x.id, x.status, x.cancel_reason, x.cancelled_by from public.rentals x where x.request_id = r.id order by x.created_at desc limit 1) ren on true
  where r.tenant_id = (select auth.uid())
  order by r.created_at desc limit 200;
$$;
revoke all on function public.incoming_requests(), public.my_requests() from public, anon;
grant execute on function public.incoming_requests(), public.my_requests() to authenticated;

-- ═════════ C. Organisation accounts (property management companies) ═════════
alter table public.organizations add column slug text;
create unique index organizations_slug_uniq on public.organizations (lower(slug)) where slug is not null;

create function private.is_org_manager(org uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organization_members where organization_id = org and user_id = (select auth.uid()) and member_role in ('owner', 'manager'));
$$;

-- Team members of an organisation that a landlord has handed properties to act as delegates for that landlord
create or replace function private.is_delegate_of(owner uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.delegations d
    where d.landlord_id = owner and d.status = 'active'
      and (d.delegate_id = (select auth.uid())
           or (d.organization_id is not null and exists (select 1 from public.organization_members m where m.organization_id = d.organization_id and m.user_id = (select auth.uid())))));
$$;

alter table public.delegations drop constraint deleg_target;
alter table public.delegations add constraint deleg_target check (delegate_id is not null or invited_email is not null or organization_id is not null);
create unique index delegations_org_uniq on public.delegations (landlord_id, organization_id) where organization_id is not null and status <> 'revoked';

drop policy deleg_select on public.delegations;
create policy deleg_select on public.delegations for select to authenticated using (
  landlord_id = (select auth.uid()) or delegate_id = (select auth.uid())
  or (status = 'invited' and lower(invited_email) = (select private.my_email()))
  or (organization_id is not null and (select private.is_org_member(organization_id))));

create or replace function private.delegation_rules() returns trigger language plpgsql as $$
begin
  if (select auth.uid()) is null or current_setting('app.bypass_delegation_rules', true) = 'on' then return new; end if;
  if new.status is distinct from old.status and new.status <> 'revoked' then raise exception 'You can only revoke access'; end if;
  new.delegate_id := old.delegate_id; new.invited_email := old.invited_email; new.landlord_id := old.landlord_id;
  new.kind := old.kind; new.organization_id := old.organization_id;
  return new;
end $$;

create table public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invited_email text not null,
  member_role text not null check (member_role in ('manager', 'member')),
  status text not null default 'invited' check (status in ('invited', 'accepted', 'declined', 'revoked')),
  invited_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create unique index org_invites_open_uniq on public.organization_invites (organization_id, lower(invited_email)) where status = 'invited';
create index on public.organization_invites (invited_by);
alter table public.organization_invites enable row level security;
create policy org_invites_select on public.organization_invites for select to authenticated
  using ((select private.is_org_manager(organization_id)) or (status = 'invited' and lower(invited_email) = (select private.my_email())));

create function public.create_organization(p_name text) returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); base text; s text; n int := 1; oid uuid;
begin
  if me is null then raise exception 'Sign in first'; end if;
  p_name := trim(p_name);
  if char_length(p_name) < 3 or char_length(p_name) > 80 then raise exception 'Use a name of 3 to 80 characters'; end if;
  if exists (select 1 from public.organizations where owner_id = me) then raise exception 'You already have an organisation'; end if;
  base := trim(both '-' from regexp_replace(lower(p_name), '[^a-z0-9]+', '-', 'g')); if base = '' then base := 'organisation'; end if;
  s := base;
  while exists (select 1 from public.organizations where lower(slug) = s) loop n := n + 1; s := base || '-' || n; end loop;
  insert into public.organizations (name, owner_id, slug) values (p_name, me, s) returning id into oid;
  insert into public.organization_members (organization_id, user_id, member_role) values (oid, me, 'owner');
  insert into public.user_roles (user_id, role) values (me, 'organization') on conflict do nothing;
  return oid;
end $$;

create function public.invite_org_member(p_org uuid, p_email text, p_role text) returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); mail text := lower(trim(p_email));
begin
  if not private.is_org_manager(p_org) then raise exception 'Only managers can invite people'; end if;
  if p_role not in ('manager', 'member') then raise exception 'Unknown role'; end if;
  if p_role = 'manager' and not exists (select 1 from public.organization_members where organization_id = p_org and user_id = me and member_role = 'owner') then
    raise exception 'Only the owner can invite managers';
  end if;
  if mail !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid email address'; end if;
  if exists (select 1 from public.organization_members m join auth.users u on u.id = m.user_id where m.organization_id = p_org and lower(u.email) = mail) then
    raise exception 'That person is already in your team';
  end if;
  insert into public.organization_invites (organization_id, invited_email, member_role, invited_by) values (p_org, mail, p_role, me);
exception when unique_violation then raise exception 'You already invited this email';
end $$;

create function public.respond_org_invite(p_id uuid, p_accept boolean) returns void language plpgsql security definer set search_path = '' as $$
declare i public.organization_invites; me uuid := (select auth.uid()); mail text; confirmed timestamptz;
begin
  if me is null then raise exception 'Sign in first'; end if;
  select lower(u.email), u.email_confirmed_at into mail, confirmed from auth.users u where u.id = me;
  select * into i from public.organization_invites where id = p_id for update;
  if not found or i.status <> 'invited' or lower(i.invited_email) is distinct from mail then raise exception 'Invitation not found'; end if;
  if p_accept and confirmed is null then raise exception 'Confirm your email address first'; end if;
  update public.organization_invites set status = case when p_accept then 'accepted' else 'declined' end, responded_at = now() where id = p_id;
  if p_accept then
    insert into public.organization_members (organization_id, user_id, member_role) values (i.organization_id, me, i.member_role) on conflict do nothing;
    insert into public.user_roles (user_id, role) values (me, 'agent') on conflict do nothing;
  end if;
end $$;

create function public.revoke_org_invite(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.organization_invites set status = 'revoked', responded_at = now()
  where id = p_id and status = 'invited' and private.is_org_manager(organization_id);
end $$;

create function public.remove_org_member(p_org uuid, p_user uuid) returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); target text;
begin
  select member_role into target from public.organization_members where organization_id = p_org and user_id = p_user;
  if target is null then return; end if;
  if target = 'owner' then raise exception 'The owner cannot be removed'; end if;
  if p_user <> me then
    if not private.is_org_manager(p_org) then raise exception 'Only managers can remove people'; end if;
    if target = 'manager' and not exists (select 1 from public.organization_members where organization_id = p_org and user_id = me and member_role = 'owner') then
      raise exception 'Only the owner can remove a manager';
    end if;
  end if;
  delete from public.organization_members where organization_id = p_org and user_id = p_user;
end $$;

-- A landlord hands their properties to an organisation using its code (slug)
create function public.invite_organization(p_slug text) returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); o public.organizations;
begin
  if me is null or not private.has_role(me, 'landlord') then raise exception 'Only landlords can do this'; end if;
  select * into o from public.organizations where lower(slug) = lower(trim(p_slug));
  if not found then raise exception 'No organisation has that code'; end if;
  insert into public.delegations (landlord_id, organization_id, kind, status) values (me, o.id, 'agent', 'invited');
exception when unique_violation then raise exception 'You already invited this organisation';
end $$;

-- The organisation accepts, declines or ends a landlord's delegation
create function public.org_set_delegation(p_id uuid, p_action text) returns void language plpgsql security definer set search_path = '' as $$
declare d public.delegations;
begin
  select * into d from public.delegations where id = p_id for update;
  if not found or d.organization_id is null or not private.is_org_manager(d.organization_id) then raise exception 'Not found'; end if;
  perform set_config('app.bypass_delegation_rules', 'on', true);
  if p_action = 'accept' and d.status = 'invited' then update public.delegations set status = 'active', responded_at = now() where id = p_id;
  elsif p_action = 'decline' and d.status = 'invited' then update public.delegations set status = 'revoked', responded_at = now() where id = p_id;
  elsif p_action = 'end' and d.status = 'active' then update public.delegations set status = 'revoked', responded_at = now() where id = p_id;
  else raise exception 'That action is not available'; end if;
end $$;

create function public.org_members(p_org uuid) returns table (user_id uuid, full_name text, member_role text)
language sql stable security definer set search_path = '' as $$
  select m.user_id, p.full_name, m.member_role from public.organization_members m join public.profiles p on p.id = m.user_id
  where m.organization_id = p_org and private.is_org_member(p_org) order by m.created_at;
$$;
create function public.org_landlords(p_org uuid) returns table (id uuid, landlord_name text, status text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select d.id, p.full_name, d.status, d.created_at from public.delegations d join public.profiles p on p.id = d.landlord_id
  where d.organization_id = p_org and d.status <> 'revoked' and private.is_org_member(p_org) order by d.created_at desc;
$$;
create function public.my_org_invites() returns table (id uuid, org_name text, member_role text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.id, o.name, i.member_role, i.created_at from public.organization_invites i join public.organizations o on o.id = i.organization_id
  where i.status = 'invited' and lower(i.invited_email) = (select private.my_email());
$$;
-- A landlord's team as one list: people by email and organisations by name
create function public.landlord_team() returns table (id uuid, label text, kind text, status text, is_org boolean, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select d.id, coalesce(o.name, d.invited_email), d.kind, d.status, d.organization_id is not null, d.created_at
  from public.delegations d left join public.organizations o on o.id = d.organization_id
  where d.landlord_id = (select auth.uid()) and d.status <> 'revoked' order by d.created_at desc;
$$;

create or replace function public.my_landlords() returns table (landlord_id uuid, display_name text, kind text)
language sql stable security definer set search_path = '' as $$
  select distinct on (d.landlord_id) d.landlord_id, p.full_name, d.kind
  from public.delegations d join public.profiles p on p.id = d.landlord_id
  where d.status = 'active' and (d.delegate_id = (select auth.uid()) or (d.organization_id is not null and private.is_org_member(d.organization_id)))
  order by d.landlord_id;
$$;

revoke all on function public.create_organization(text), public.invite_org_member(uuid, text, text), public.respond_org_invite(uuid, boolean),
  public.revoke_org_invite(uuid), public.remove_org_member(uuid, uuid), public.invite_organization(text), public.org_set_delegation(uuid, text),
  public.org_members(uuid), public.org_landlords(uuid), public.my_org_invites(), public.landlord_team() from public, anon;
grant execute on function public.create_organization(text), public.invite_org_member(uuid, text, text), public.respond_org_invite(uuid, boolean),
  public.revoke_org_invite(uuid), public.remove_org_member(uuid, uuid), public.invite_organization(text), public.org_set_delegation(uuid, text),
  public.org_members(uuid), public.org_landlords(uuid), public.my_org_invites(), public.landlord_team() to authenticated;
