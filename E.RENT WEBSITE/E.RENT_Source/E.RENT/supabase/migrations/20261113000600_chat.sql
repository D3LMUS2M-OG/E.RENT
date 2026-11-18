-- Step 9: private chat, reports, sanctions. Depends on migrations 1 to 5.
-- Rules live here: one conversation per tenant per listing, phone numbers masked, blocks, 30-day retention flags,
-- reported conversations copied as evidence, staff read reported conversations only (and every open is audited).

create type public.message_kind as enum ('text', 'image', 'voice', 'document');
create type public.sanction_kind as enum ('warning', 'summons', 'suspension', 'ban');

-- ───────── Conversations ─────────
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  tenant_id uuid not null references auth.users(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,      -- the listing owner when the chat began
  handler_id uuid references auth.users(id),                               -- first landlord-side person to reply (owner or delegate)
  last_message_at timestamptz not null default now(),
  tenant_deleted_at timestamptz,
  landlord_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (listing_id, tenant_id),
  check (tenant_id <> owner_id)
);
create index on public.conversations (tenant_id, last_message_at desc);
create index on public.conversations (owner_id, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  kind public.message_kind not null default 'text',
  body text check (char_length(body) <= 2000),
  attachment_path text, attachment_name text, attachment_mime text, attachment_bytes integer, duration_s smallint,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check ((kind = 'text' and char_length(trim(coalesce(body, ''))) > 0) or (kind <> 'text' and attachment_path is not null))
);
create index on public.messages (conversation_id, created_at);
create index on public.messages (created_at);              -- 30-day purge
create index on public.messages (sender_id);

create table public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index on public.blocks (blocked_id);

-- ───────── Reports, evidence, sanctions ─────────
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete set null,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('scam', 'pressure_to_pay', 'harassment', 'fake_listing', 'inappropriate', 'other')),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  resolution_note text,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.reports (status, created_at desc);
create index on public.reports (reporter_id);
create index on public.reports (reported_user_id);

create table public.report_evidence (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  message_id uuid,
  sender_id uuid not null,
  kind public.message_kind not null,
  body text,
  attachment_name text, attachment_mime text,
  evidence_path text,                  -- copy of the attachment in the private report-evidence bucket
  sent_at timestamptz not null
);
create index on public.report_evidence (report_id, sent_at);

create table public.user_sanctions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.sanction_kind not null,
  reason text not null check (char_length(reason) between 10 and 1000),
  issued_by uuid not null references auth.users(id),
  report_id uuid references public.reports(id) on delete set null,
  ends_at timestamptz,
  acknowledged_at timestamptz,
  lifted_at timestamptz,
  lifted_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index on public.user_sanctions (user_id, created_at desc);
create index on public.user_sanctions (issued_by);

-- ───────── Helpers ─────────
create function private.is_chat_participant(conv uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversations c where c.id = conv
    and (c.tenant_id = (select auth.uid()) or c.owner_id = (select auth.uid()) or private.is_delegate_of(c.owner_id)));
$$;

create function private.is_sanctioned(uid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_sanctions s where s.user_id = uid and s.kind in ('suspension', 'ban')
    and s.lifted_at is null and (s.ends_at is null or s.ends_at > now()));
$$;

create function private.block_sanctioned() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and private.is_sanctioned((select auth.uid())) then
    raise exception 'Your account is suspended. See the notice under Account';
  end if;
  return new;
end $$;
create trigger sanctioned_listings before insert on public.listings for each row execute function private.block_sanctioned();
create trigger sanctioned_requests before insert on public.rental_requests for each row execute function private.block_sanctioned();
create trigger sanctioned_conversations before insert on public.conversations for each row execute function private.block_sanctioned();
create trigger sanctioned_messages before insert on public.messages for each row execute function private.block_sanctioned();

-- Is there a block between the sender and the people they are talking to in this conversation?
create function private.chat_blocked(conv uuid, sender uuid) returns boolean language plpgsql stable security definer set search_path = '' as $$
declare c public.conversations;
begin
  select * into c from public.conversations where id = conv;
  if not found then return false; end if;
  if sender = c.tenant_id then
    return exists (select 1 from public.blocks b where (b.blocker_id = sender and b.blocked_id in (c.owner_id, c.handler_id))
                                                     or (b.blocked_id = sender and b.blocker_id in (c.owner_id, c.handler_id)));
  end if;
  return exists (select 1 from public.blocks b where (b.blocker_id = c.tenant_id and b.blocked_id in (sender, c.owner_id))
                                                   or (b.blocked_id = c.tenant_id and b.blocker_id in (sender, c.owner_id)));
end $$;

-- ───────── Message rules ─────────
create function private.message_rules() returns trigger language plpgsql security definer set search_path = '' as $$
declare actor uuid := (select auth.uid()); c public.conversations;
begin
  select * into c from public.conversations where id = new.conversation_id;
  if not found then raise exception 'Conversation not found'; end if;
  if actor is not null then
    if new.sender_id <> actor then raise exception 'You can only send as yourself'; end if;
    if private.chat_blocked(new.conversation_id, actor) then raise exception 'You cannot send messages in this conversation'; end if;
    if (select count(*) from public.messages where sender_id = actor and created_at > now() - interval '60 seconds') >= 20 then
      raise exception 'You are sending messages too fast. Wait a moment';
    end if;
  end if;
  new.read_at := null;

  if new.kind = 'text' then
    -- Phone numbers stay hidden until the other person approves sharing (CHT-4). Best effort on the typed text.
    new.body := regexp_replace(new.body, '(?<![0-9])(\+?\s?254|0)[\s.\-]*[17]([\s.\-]*[0-9]){8}(?![0-9])', '[number hidden]', 'g');
  else
    if split_part(new.attachment_path, '/', 1) <> new.conversation_id::text then raise exception 'Invalid attachment'; end if;
    new.body := null;
  end if;

  update public.conversations set last_message_at = now(), tenant_deleted_at = null, landlord_deleted_at = null,
         handler_id = case when new.sender_id <> tenant_id and handler_id is null then new.sender_id else handler_id end
  where id = new.conversation_id;
  return new;
end $$;
create trigger message_rules before insert on public.messages for each row execute function private.message_rules();

-- ───────── Row-level security ─────────
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.report_evidence enable row level security;
alter table public.user_sanctions enable row level security;

create policy conv_select on public.conversations for select to authenticated
  using (tenant_id = (select auth.uid()) or owner_id = (select auth.uid()) or (select private.is_delegate_of(owner_id)));
-- no insert/update/delete: start_conversation(), delete_conversation() do it

create policy msg_select on public.messages for select to authenticated using ((select private.is_chat_participant(conversation_id)));
create policy msg_insert on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and (select private.is_chat_participant(conversation_id)));
-- read receipts go through mark_conversation_read(); nobody edits or deletes messages

create policy blocks_own on public.blocks for all to authenticated
  using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));

create policy reports_select on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select private.has_permission('report.read')));
create policy evidence_select on public.report_evidence for select to authenticated using ((select private.has_permission('report.read')));

create policy sanctions_select on public.user_sanctions for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_permission('user.read')));

-- ───────── Storage: private buckets ─────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('chat-attachments', 'chat-attachments', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg',
     'audio/x-m4a', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('report-evidence', 'report-evidence', false, 10485760, null)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "chat attachments insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-attachments' and (select private.is_chat_participant(((storage.foldername(name))[1])::uuid)));
create policy "chat attachments read" on storage.objects for select to authenticated
  using (bucket_id = 'chat-attachments' and (select private.is_chat_participant(((storage.foldername(name))[1])::uuid)));
create policy "report evidence read" on storage.objects for select to authenticated
  using (bucket_id = 'report-evidence' and (select private.has_permission('report.read')));

-- ───────── Realtime: row changes for messages, and private channels for typing and presence ─────────
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; when undefined_object then raise notice 'supabase_realtime publication not found'; end $$;
do $$ begin
  create policy "chat members listen" on realtime.messages for select to authenticated
    using (realtime.topic() like 'chat:%' and (select private.is_chat_participant(substring(realtime.topic() from 6)::uuid)));
  create policy "chat members send" on realtime.messages for insert to authenticated
    with check (realtime.topic() like 'chat:%' and (select private.is_chat_participant(substring(realtime.topic() from 6)::uuid)));
exception when others then raise notice 'realtime.messages policies not created: %', sqlerrm; end $$;

-- ───────── Starting, reading, deleting ─────────
create function public.start_conversation(p_listing uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); l record; cid uuid;
begin
  if me is null then raise exception 'Sign in first'; end if;
  if private.is_sanctioned(me) then raise exception 'Your account is suspended. See the notice under Account'; end if;
  select owner_id, created_by, status, expires_at into l from public.listings where id = p_listing;
  if not found or l.status <> 'active' or l.expires_at <= now() then raise exception 'This house is no longer available'; end if;
  if me in (l.owner_id, l.created_by) or private.is_delegate_of(l.owner_id) then raise exception 'This is your own listing'; end if;
  if exists (select 1 from public.blocks b where (b.blocker_id = me and b.blocked_id = l.owner_id) or (b.blocker_id = l.owner_id and b.blocked_id = me)) then
    raise exception 'You cannot message this landlord';
  end if;
  insert into public.conversations (listing_id, tenant_id, owner_id) values (p_listing, me, l.owner_id)
  on conflict (listing_id, tenant_id) do update set tenant_deleted_at = null returning id into cid;
  return cid;
end $$;

create function public.mark_conversation_read(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); c public.conversations;
begin
  select * into c from public.conversations where id = p_id;
  if not found or not private.is_chat_participant(p_id) then return; end if;
  if me = c.tenant_id then
    update public.messages set read_at = now() where conversation_id = p_id and read_at is null and sender_id <> c.tenant_id;
  else
    update public.messages set read_at = now() where conversation_id = p_id and read_at is null and sender_id = c.tenant_id;
  end if;
end $$;

-- Hides the conversation for the caller's side. A daily job deletes it for good once both sides deleted it, or after 30 days.
create function public.delete_conversation(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); c public.conversations;
begin
  select * into c from public.conversations where id = p_id;
  if not found or not private.is_chat_participant(p_id) then raise exception 'Conversation not found'; end if;
  if me = c.tenant_id then update public.conversations set tenant_deleted_at = now() where id = p_id;
  else update public.conversations set landlord_deleted_at = now() where id = p_id; end if;
end $$;

-- ───────── Inbox and header data ─────────
create function public.my_conversations() returns table (
  id uuid, listing_id uuid, listing_title text, listing_slug text, my_role text, other_name text,
  last_message_at timestamptz, last_preview text, unread integer, blocked boolean)
language sql stable security definer set search_path = '' as $$
  select c.id, c.listing_id, l.title, l.slug,
         case when c.tenant_id = me.uid then 'tenant' else 'landlord' end,
         case when c.tenant_id = me.uid then coalesce(nullif(hp.full_name, ''), op.full_name) else tp.full_name end,
         c.last_message_at,
         (select case m.kind when 'text' then left(m.body, 80) when 'image' then 'Photo' when 'voice' then 'Voice note' else 'Document' end
            from public.messages m where m.conversation_id = c.id order by m.created_at desc limit 1),
         (select count(*)::int from public.messages m where m.conversation_id = c.id and m.read_at is null
            and case when c.tenant_id = me.uid then m.sender_id <> c.tenant_id else m.sender_id = c.tenant_id end),
         exists (select 1 from public.blocks b where
            (b.blocker_id = me.uid and b.blocked_id = case when c.tenant_id = me.uid then coalesce(c.handler_id, c.owner_id) else c.tenant_id end)
            or (b.blocked_id = me.uid and b.blocker_id = case when c.tenant_id = me.uid then coalesce(c.handler_id, c.owner_id) else c.tenant_id end))
  from public.conversations c
  cross join (select (select auth.uid()) as uid) me
  join public.listings l on l.id = c.listing_id
  join public.profiles tp on tp.id = c.tenant_id
  join public.profiles op on op.id = c.owner_id
  left join public.profiles hp on hp.id = c.handler_id
  where (c.tenant_id = me.uid and c.tenant_deleted_at is null)
     or ((c.owner_id = me.uid or private.is_delegate_of(c.owner_id)) and c.landlord_deleted_at is null)
  order by c.last_message_at desc limit 200;
$$;

create function public.unread_chat_count() returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(sum(unread), 0)::int from public.my_conversations();
$$;

create function public.chat_overview(p_id uuid) returns table (
  id uuid, listing_id uuid, listing_title text, listing_slug text, listing_status text, my_role text, other_name text,
  other_verified boolean, tenant_id uuid, other_user_id uuid, i_blocked boolean, blocked_me boolean)
language sql stable security definer set search_path = '' as $$
  select c.id, c.listing_id, l.title, l.slug, l.status::text,
         case when c.tenant_id = me.uid then 'tenant' else 'landlord' end,
         case when c.tenant_id = me.uid then coalesce(nullif(hp.full_name, ''), op.full_name) else tp.full_name end,
         case when c.tenant_id = me.uid then private.is_verified(c.owner_id) else false end,
         c.tenant_id,
         case when c.tenant_id = me.uid then coalesce(c.handler_id, c.owner_id) else c.tenant_id end,
         exists (select 1 from public.blocks b where b.blocker_id = me.uid and b.blocked_id = case when c.tenant_id = me.uid then coalesce(c.handler_id, c.owner_id) else c.tenant_id end),
         exists (select 1 from public.blocks b where b.blocked_id = me.uid and b.blocker_id = case when c.tenant_id = me.uid then coalesce(c.handler_id, c.owner_id) else c.tenant_id end)
  from public.conversations c
  cross join (select (select auth.uid()) as uid) me
  join public.listings l on l.id = c.listing_id
  join public.profiles tp on tp.id = c.tenant_id
  join public.profiles op on op.id = c.owner_id
  left join public.profiles hp on hp.id = c.handler_id
  where c.id = p_id and private.is_chat_participant(c.id);
$$;

-- ───────── Phone numbers inside a chat (same approval rule as requests) ─────────
alter table public.contact_shares alter column request_id drop not null;
alter table public.contact_shares add column conversation_id uuid references public.conversations(id) on delete cascade;
alter table public.contact_shares add constraint contact_share_source check ((request_id is null) <> (conversation_id is null));
alter table public.contact_shares add constraint contact_shares_conv_uniq unique (conversation_id, grantor_id, grantee_id);
create index on public.contact_shares (conversation_id);

create function private.chat_counterpart(p_conv uuid) returns uuid language plpgsql stable security definer set search_path = '' as $$
declare c public.conversations; me uuid := (select auth.uid());
begin
  select * into c from public.conversations where id = p_conv;
  if not found or c.handler_id is null then return null; end if;      -- opens after the landlord side has replied
  if me = c.tenant_id then return c.handler_id; elsif me = c.handler_id then return c.tenant_id; end if;
  return null;
end $$;

create function public.set_chat_contact_share(p_conv uuid, p_action text) returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); cp uuid; my_phone text;
begin
  if me is null then raise exception 'Sign in first'; end if;
  cp := private.chat_counterpart(p_conv);
  if cp is null then raise exception 'Sharing numbers opens once the landlord side has replied, between the tenant and the person who replied'; end if;
  if p_action = 'ask' then
    insert into public.contact_shares (conversation_id, grantor_id, grantee_id, status) values (p_conv, cp, me, 'pending')
    on conflict (conversation_id, grantor_id, grantee_id) do nothing;
  elsif p_action in ('share', 'approve') then
    select phone into my_phone from public.profiles where id = me;
    if my_phone is null then raise exception 'Add your phone number under Account first'; end if;
    insert into public.contact_shares (conversation_id, grantor_id, grantee_id, status, responded_at) values (p_conv, me, cp, 'approved', now())
    on conflict (conversation_id, grantor_id, grantee_id) do update set status = 'approved', responded_at = now();
  elsif p_action in ('decline', 'revoke') then
    update public.contact_shares set status = case when p_action = 'decline' then 'declined'::public.share_status else 'revoked'::public.share_status end, responded_at = now()
    where conversation_id = p_conv and grantor_id = me and grantee_id = cp;
  else raise exception 'Unknown action'; end if;
end $$;

create function public.chat_contact_state(p_conv uuid) returns table (
  counterpart_name text, theirs_status text, their_phone text, mine_status text, my_phone_set boolean, available boolean)
language plpgsql stable security definer set search_path = '' as $$
declare cp uuid := private.chat_counterpart(p_conv); me uuid := (select auth.uid());
begin
  if cp is null then
    return query select ''::text, null::text, null::text, null::text, false, false; return;
  end if;
  return query
  select p.full_name, ts.status::text, case when ts.status = 'approved' then p.phone end, ms.status::text,
         (select mp.phone is not null from public.profiles mp where mp.id = me), true
  from public.profiles p
  left join public.contact_shares ts on ts.conversation_id = p_conv and ts.grantor_id = cp and ts.grantee_id = me
  left join public.contact_shares ms on ms.conversation_id = p_conv and ms.grantor_id = me and ms.grantee_id = cp
  where p.id = cp;
end $$;

-- ───────── Reporting ─────────
create function public.report_conversation(p_conv uuid, p_reason text, p_details text) returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); c public.conversations; other uuid; rid uuid;
begin
  select * into c from public.conversations where id = p_conv;
  if not found or not private.is_chat_participant(p_conv) then raise exception 'Conversation not found'; end if;
  if (select count(*) from public.reports where reporter_id = me and created_at > now() - interval '24 hours') >= 10 then raise exception 'You have sent many reports today'; end if;
  other := case when me = c.tenant_id then coalesce(c.handler_id, c.owner_id) else c.tenant_id end;
  insert into public.reports (conversation_id, reporter_id, reported_user_id, reason, details) values (p_conv, me, other, p_reason, left(coalesce(p_details, ''), 1000)) returning id into rid;
  -- Copy the last 100 messages so the report still stands after the 30-day purge
  insert into public.report_evidence (report_id, message_id, sender_id, kind, body, attachment_name, attachment_mime, evidence_path, sent_at)
  select rid, m.id, m.sender_id, m.kind, m.body, m.attachment_name, m.attachment_mime, m.attachment_path, m.created_at
  from (select * from public.messages where conversation_id = p_conv order by created_at desc limit 100) m;
  return rid;
end $$;

create function public.report_listing(p_listing uuid, p_reason text, p_details text) returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if me is null then raise exception 'Sign in to report a listing'; end if;
  if p_reason not in ('scam', 'fake_listing', 'inappropriate', 'wrong_info', 'other') then raise exception 'Choose a reason'; end if;
  if (select count(*) from public.listing_flags where kind = 'report' and detail ->> 'reporter' = me::text and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'You have sent many reports today';
  end if;
  if not exists (select 1 from public.listings where id = p_listing) then raise exception 'Listing not found'; end if;
  insert into public.listing_flags (listing_id, kind, detail) values (p_listing, 'report', jsonb_build_object('reporter', me, 'reason', p_reason, 'details', left(coalesce(p_details, ''), 1000)));
end $$;

-- ───────── Staff actions (all audited inside the function) ─────────
create function public.issue_sanction(p_user uuid, p_kind public.sanction_kind, p_reason text, p_days integer default null, p_report uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); need text; sid uuid;
begin
  need := case p_kind when 'warning' then 'user.warn' when 'summons' then 'user.warn' when 'suspension' then 'user.suspend' else 'user.ban' end;
  if not private.has_permission(need) then raise exception 'You do not have permission for this'; end if;
  if p_user = me then raise exception 'You cannot do this to yourself'; end if;
  if exists (select 1 from public.staff_roles where user_id = p_user and role = 'super_admin') then raise exception 'A super admin cannot be sanctioned'; end if;
  insert into public.user_sanctions (user_id, kind, reason, issued_by, report_id, ends_at)
  values (p_user, p_kind, trim(p_reason), me, p_report, case when p_kind = 'suspension' then now() + make_interval(days => greatest(coalesce(p_days, 7), 1)) end) returning id into sid;
  if p_report is not null then
    update public.reports set status = 'actioned', resolved_by = me, resolved_at = now(), resolution_note = p_kind::text where id = p_report and status = 'open';
  end if;
  insert into public.admin_audit_log (actor_id, action, target_type, target_id, metadata)
  values (me, 'user.' || p_kind::text, 'user', p_user::text, jsonb_build_object('reason', trim(p_reason), 'report', p_report, 'days', p_days));
  return sid;
end $$;

create function public.lift_sanction(p_id uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); s public.user_sanctions; need text;
begin
  select * into s from public.user_sanctions where id = p_id;
  if not found then raise exception 'Not found'; end if;
  need := case s.kind when 'warning' then 'user.warn' when 'summons' then 'user.warn' when 'suspension' then 'user.suspend' else 'user.ban' end;
  if not private.has_permission(need) then raise exception 'You do not have permission for this'; end if;
  update public.user_sanctions set lifted_at = now(), lifted_by = me where id = p_id and lifted_at is null;
  insert into public.admin_audit_log (actor_id, action, target_type, target_id, metadata) values (me, 'user.sanction_lifted', 'user', s.user_id::text, jsonb_build_object('sanction', p_id, 'kind', s.kind));
  return s.user_id;
end $$;

create function public.resolve_report(p_id uuid, p_note text) returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if not private.has_permission('report.read') then raise exception 'You do not have permission for this'; end if;
  update public.reports set status = 'dismissed', resolved_by = me, resolved_at = now(), resolution_note = left(p_note, 500) where id = p_id and status = 'open';
  insert into public.admin_audit_log (actor_id, action, target_type, target_id, metadata) values (me, 'report.dismissed', 'report', p_id::text, jsonb_build_object('note', left(p_note, 500)));
end $$;

create function public.acknowledge_sanction(p_id uuid) returns void language sql security definer set search_path = '' as $$
  update public.user_sanctions set acknowledged_at = now() where id = p_id and user_id = (select auth.uid()) and kind in ('warning', 'summons');
$$;

create function public.my_notices() returns table (id uuid, kind text, reason text, ends_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.id, s.kind::text, s.reason, s.ends_at, s.created_at from public.user_sanctions s
  where s.user_id = (select auth.uid()) and s.lifted_at is null
    and ((s.kind in ('warning', 'summons') and s.acknowledged_at is null) or (s.kind in ('suspension', 'ban') and (s.ends_at is null or s.ends_at > now())))
  order by s.created_at desc;
$$;

revoke all on function public.start_conversation(uuid), public.mark_conversation_read(uuid), public.delete_conversation(uuid), public.my_conversations(),
  public.unread_chat_count(), public.chat_overview(uuid), public.set_chat_contact_share(uuid, text), public.chat_contact_state(uuid),
  public.report_conversation(uuid, text, text), public.report_listing(uuid, text, text),
  public.issue_sanction(uuid, public.sanction_kind, text, integer, uuid), public.lift_sanction(uuid), public.resolve_report(uuid, text),
  public.acknowledge_sanction(uuid), public.my_notices() from public, anon;
grant execute on function public.start_conversation(uuid), public.mark_conversation_read(uuid), public.delete_conversation(uuid), public.my_conversations(),
  public.unread_chat_count(), public.chat_overview(uuid), public.set_chat_contact_share(uuid, text), public.chat_contact_state(uuid),
  public.report_conversation(uuid, text, text), public.report_listing(uuid, text, text),
  public.issue_sanction(uuid, public.sanction_kind, text, integer, uuid), public.lift_sanction(uuid), public.resolve_report(uuid, text),
  public.acknowledge_sanction(uuid), public.my_notices() to authenticated;
