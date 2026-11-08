-- E.Rent foundation (Step 3): geography, profiles, roles, organisations, delegations,
-- feature flags, staff permissions, audit log. RLS is enabled on every table.

create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create schema if not exists private;
grant usage on schema private to anon, authenticated, supabase_auth_admin;

create type public.app_role as enum ('tenant', 'landlord', 'agent', 'organization');

-- ───────── Geography ─────────
create table public.counties (
  id smallint primary key,
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);
create table public.sub_counties (
  id integer generated always as identity primary key,
  county_id smallint not null references public.counties(id) on delete cascade,
  name text not null,
  slug text not null,
  unique (county_id, slug)
);
create table public.wards (
  id integer generated always as identity primary key,
  sub_county_id integer not null references public.sub_counties(id) on delete cascade,
  name text not null,
  slug text not null,
  unique (sub_county_id, slug)
);
create index on public.wards (sub_county_id);
create index sub_counties_name_trgm on public.sub_counties using gin (name extensions.gin_trgm_ops);
create index wards_name_trgm on public.wards using gin (name extensions.gin_trgm_ops);

-- ───────── People ─────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  phone text,
  phone_verified_at timestamptz,
  home_county_id smallint references public.counties(id),
  low_data_mode boolean not null default false,
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  locale text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.profiles (home_county_id);

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index on public.organizations (owner_id);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('owner', 'manager', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index on public.organization_members (user_id);

-- Landlord → agent/caretaker link. Landlord approves listings and can revoke at any time (ACC-7).
create table public.delegations (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references auth.users(id) on delete cascade,
  delegate_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  status text not null default 'invited' check (status in ('invited', 'active', 'revoked')),
  created_at timestamptz not null default now(),
  unique (landlord_id, delegate_id),
  check (landlord_id <> delegate_id)
);
create index on public.delegations (delegate_id);
create index on public.delegations (organization_id);

-- ───────── Platform ─────────
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table public.staff_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin', 'moderator', 'verifier', 'support', 'analyst')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);
create table public.role_permissions (
  role text not null check (role in ('super_admin', 'moderator', 'verifier', 'support', 'analyst')),
  permission text not null,
  primary key (role, permission)
);
create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id),
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.admin_audit_log (actor_id, created_at desc);
create index on public.admin_audit_log (target_type, target_id);

-- ───────── Permission helpers (security definer, private schema) ─────────
create function private.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff_roles where user_id = (select auth.uid()) and role = 'super_admin');
$$;

create function private.has_permission(p text) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_super_admin() or exists (
    select 1 from public.staff_roles s
    join public.role_permissions rp on rp.role = s.role
    where s.user_id = (select auth.uid()) and rp.permission = p
  );
$$;

create function private.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff_roles where user_id = (select auth.uid()));
$$;

create function private.is_org_member(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organization_members where organization_id = org and user_id = (select auth.uid()));
$$;

-- ───────── New user: profile + starting role ─────────
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare initial text := coalesce(new.raw_user_meta_data ->> 'initial_role', 'tenant');
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));

  insert into public.user_roles (user_id, role) values (new.id, 'tenant');
  -- Self-serve landlord only. Agent, organisation and staff roles are never granted from sign-up metadata.
  if initial = 'landlord' then
    insert into public.user_roles (user_id, role) values (new.id, 'landlord');
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

create function private.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function private.touch_updated_at();

-- ───────── Auth hook: roles into the JWT (ADR-002) ─────────
create function public.custom_access_token_hook(event jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  claims jsonb := event -> 'claims';
  uid uuid := (event ->> 'user_id')::uuid;
  roles jsonb;
  staff jsonb;
begin
  select coalesce(jsonb_agg(role), '[]') into roles from public.user_roles where user_id = uid;
  select coalesce(jsonb_agg(role), '[]') into staff from public.staff_roles where user_id = uid;
  claims := jsonb_set(claims, '{user_roles}', roles);
  claims := jsonb_set(claims, '{staff_roles}', staff);
  return jsonb_set(event, '{claims}', claims);
end $$;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

-- ───────── Row-level security on every table ─────────
alter table public.counties enable row level security;
alter table public.sub_counties enable row level security;
alter table public.wards enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.delegations enable row level security;
alter table public.app_settings enable row level security;
alter table public.staff_roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.admin_audit_log enable row level security;

-- Geography: public read, staff with data.manage write
create policy geo_read on public.counties for select to anon, authenticated using (true);
create policy geo_read on public.sub_counties for select to anon, authenticated using (true);
create policy geo_read on public.wards for select to anon, authenticated using (true);
create policy geo_write on public.counties for all to authenticated using ((select private.has_permission('data.manage'))) with check ((select private.has_permission('data.manage')));
create policy geo_write on public.sub_counties for all to authenticated using ((select private.has_permission('data.manage'))) with check ((select private.has_permission('data.manage')));
create policy geo_write on public.wards for all to authenticated using ((select private.has_permission('data.manage'))) with check ((select private.has_permission('data.manage')));

-- Profiles: own row, or staff who can read users. Public landlord profiles come through a view in Step 10.
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.has_permission('user.read')));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- User roles: users may add or drop tenant, landlord and agent for themselves. Never organization or staff.
create policy roles_select on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_permission('user.read')));
create policy roles_insert on public.user_roles for insert to authenticated
  with check (user_id = (select auth.uid()) and role in ('tenant', 'landlord', 'agent'));
create policy roles_delete on public.user_roles for delete to authenticated
  using (user_id = (select auth.uid()) and role in ('landlord', 'agent'));

-- Organisations
create policy org_select on public.organizations for select to authenticated
  using (owner_id = (select auth.uid()) or (select private.is_org_member(id)));
create policy org_insert on public.organizations for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy org_update on public.organizations for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy org_members_select on public.organization_members for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_org_member(organization_id)));
create policy org_members_write on public.organization_members for all to authenticated
  using (exists (select 1 from public.organizations o where o.id = organization_id and o.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.organizations o where o.id = organization_id and o.owner_id = (select auth.uid())));

-- Delegations: landlord invites and revokes. The delegate may accept an invitation.
create policy deleg_select on public.delegations for select to authenticated
  using (landlord_id = (select auth.uid()) or delegate_id = (select auth.uid()));
create policy deleg_insert on public.delegations for insert to authenticated
  with check (landlord_id = (select auth.uid()) and status = 'invited');
create policy deleg_landlord_update on public.delegations for update to authenticated
  using (landlord_id = (select auth.uid())) with check (landlord_id = (select auth.uid()));
create policy deleg_delegate_accept on public.delegations for update to authenticated
  using (delegate_id = (select auth.uid()) and status = 'invited')
  with check (delegate_id = (select auth.uid()) and status in ('active', 'revoked'));

-- App settings (flags): readable by everyone, only super admin writes
create policy settings_read on public.app_settings for select to anon, authenticated using (true);
create policy settings_write on public.app_settings for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

-- Staff
create policy staff_select on public.staff_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_super_admin()));
create policy staff_write on public.staff_roles for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy perms_select on public.role_permissions for select to authenticated using ((select private.is_staff()));
create policy perms_write on public.role_permissions for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

-- Audit log: append-only. Staff insert their own entries, auditors read. No update or delete for anyone.
create policy audit_select on public.admin_audit_log for select to authenticated using ((select private.has_permission('audit.read')));
create policy audit_insert on public.admin_audit_log for insert to authenticated
  with check (actor_id = (select auth.uid()) and (select private.is_staff()));
revoke update, delete, truncate on public.admin_audit_log from anon, authenticated;
revoke all on public.app_settings, public.staff_roles, public.role_permissions, public.admin_audit_log from anon;
grant select on public.app_settings to anon;

-- ───────── Seed: permissions and flags ─────────
insert into public.role_permissions (role, permission) values
  ('super_admin', 'audit.read'), ('super_admin', 'data.manage'), ('super_admin', 'user.read'),
  ('moderator', 'listing.takedown'), ('moderator', 'review.delete'), ('moderator', 'report.read'),
  ('moderator', 'user.read'), ('moderator', 'user.warn'), ('moderator', 'user.suspend'), ('moderator', 'user.ban'),
  ('verifier', 'verification.approve'), ('verifier', 'user.read'),
  ('support', 'user.read'), ('support', 'user.warn'),
  ('analyst', 'analytics.read');

insert into public.app_settings (key, value) values
  ('require_phone_verification', 'false'), ('enable_phone_login', 'false'), ('enable_google_login', 'false'),
  ('enable_sms_notifications', 'false'), ('enable_paid_features', 'false'),
  ('enable_whatsapp', 'false'), ('enable_student_mode', 'false');
