-- Deleting single messages: "delete for me" (hides it for you only) and "delete for everyone" (sender only, within 48 hours).
-- A message deleted for everyone leaves a tombstone. Its content moves out of the readable row into a private table,
-- so the other person can no longer read it, but a moderator can still see it if the conversation is reported.

alter table public.messages add column deleted_for_everyone_at timestamptz;

do $$ declare c text; begin
  select conname into c from pg_constraint
  where conrelid = 'public.messages'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%attachment_path IS NOT NULL%';
  if c is not null then execute format('alter table public.messages drop constraint %I', c); end if;
end $$;
alter table public.messages add constraint messages_content_check check (
  deleted_for_everyone_at is not null
  or (kind = 'text' and char_length(trim(coalesce(body, ''))) > 0)
  or (kind <> 'text' and attachment_path is not null));

create table public.message_hides (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
create index on public.message_hides (user_id);
alter table public.message_hides enable row level security;
create policy hides_select on public.message_hides for select to authenticated using (user_id = (select auth.uid()));
-- writes go through hide_message()

-- Private store for content deleted for everyone. No policies: only the functions below and the service role touch it.
create table public.deleted_message_originals (
  message_id uuid primary key references public.messages(id) on delete cascade,
  conversation_id uuid not null,
  sender_id uuid not null,
  body text,
  attachment_path text,           -- where the file was in chat-attachments
  archived_path text,             -- where it was moved in report-evidence (deleted/...), if the move worked
  attachment_name text, attachment_mime text,
  deleted_at timestamptz not null default now()
);
create index on public.deleted_message_originals (deleted_at);
alter table public.deleted_message_originals enable row level security;

alter table public.report_evidence add column was_deleted boolean not null default false;

create function public.hide_message(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare m public.messages;
begin
  select * into m from public.messages where id = p_id;
  if not found or not private.is_chat_participant(m.conversation_id) then raise exception 'Message not found'; end if;
  insert into public.message_hides (message_id, user_id) values (p_id, (select auth.uid())) on conflict do nothing;
end $$;

-- Returns the attachment path (so the server can move the file out of the chat bucket), or null.
create function public.delete_message_for_everyone(p_id uuid) returns text language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); m public.messages;
begin
  select * into m from public.messages where id = p_id for update;
  if not found or m.sender_id <> me or not private.is_chat_participant(m.conversation_id) then raise exception 'Message not found'; end if;
  if m.deleted_for_everyone_at is not null then return null; end if;
  if m.created_at < now() - interval '48 hours' then raise exception 'You can delete a message for everyone within 48 hours of sending it'; end if;
  insert into public.deleted_message_originals (message_id, conversation_id, sender_id, body, attachment_path, attachment_name, attachment_mime)
  values (m.id, m.conversation_id, m.sender_id, m.body, m.attachment_path, m.attachment_name, m.attachment_mime);
  update public.messages set deleted_for_everyone_at = now(), body = null, attachment_path = null, attachment_name = null,
         attachment_mime = null, attachment_bytes = null, duration_s = null where id = p_id;
  return m.attachment_path;
end $$;

-- Reports now include messages that were deleted for everyone, marked as deleted, so deleting cannot hide abuse.
create or replace function public.report_conversation(p_conv uuid, p_reason text, p_details text) returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); c public.conversations; other uuid; rid uuid;
begin
  select * into c from public.conversations where id = p_conv;
  if not found or not private.is_chat_participant(p_conv) then raise exception 'Conversation not found'; end if;
  if (select count(*) from public.reports where reporter_id = me and created_at > now() - interval '24 hours') >= 10 then raise exception 'You have sent many reports today'; end if;
  other := case when me = c.tenant_id then coalesce(c.handler_id, c.owner_id) else c.tenant_id end;
  insert into public.reports (conversation_id, reporter_id, reported_user_id, reason, details) values (p_conv, me, other, p_reason, left(coalesce(p_details, ''), 1000)) returning id into rid;
  insert into public.report_evidence (report_id, message_id, sender_id, kind, body, attachment_name, attachment_mime, evidence_path, sent_at, was_deleted)
  select rid, m.id, m.sender_id, m.kind, coalesce(o.body, m.body), coalesce(o.attachment_name, m.attachment_name), coalesce(o.attachment_mime, m.attachment_mime),
         coalesce(o.archived_path, o.attachment_path, m.attachment_path), m.created_at, m.deleted_for_everyone_at is not null
  from (select * from public.messages where conversation_id = p_conv order by created_at desc limit 100) m
  left join public.deleted_message_originals o on o.message_id = m.id;
  return rid;
end $$;

create or replace function public.my_conversations() returns table (
  id uuid, listing_id uuid, listing_title text, listing_slug text, my_role text, other_name text,
  last_message_at timestamptz, last_preview text, unread integer, blocked boolean, other_user_id uuid)
language sql stable security definer set search_path = '' as $$
  select c.id, c.listing_id, l.title, l.slug,
         case when c.tenant_id = me.uid then 'tenant' else 'landlord' end,
         case when c.tenant_id = me.uid then coalesce(nullif(hp.full_name, ''), op.full_name) else tp.full_name end,
         c.last_message_at,
         (select case when m.deleted_for_everyone_at is not null then 'This message was deleted'
                      else case m.kind when 'text' then left(m.body, 80) when 'image' then 'Photo' when 'voice' then 'Voice note' else 'Document' end end
            from public.messages m where m.conversation_id = c.id
              and not exists (select 1 from public.message_hides h where h.message_id = m.id and h.user_id = me.uid)
            order by m.created_at desc limit 1),
         (select count(*)::int from public.messages m where m.conversation_id = c.id and m.read_at is null and m.deleted_for_everyone_at is null
            and not exists (select 1 from public.message_hides h where h.message_id = m.id and h.user_id = me.uid)
            and case when c.tenant_id = me.uid then m.sender_id <> c.tenant_id else m.sender_id = c.tenant_id end),
         exists (select 1 from public.blocks b where
            (b.blocker_id = me.uid and b.blocked_id = case when c.tenant_id = me.uid then coalesce(c.handler_id, c.owner_id) else c.tenant_id end)
            or (b.blocked_id = me.uid and b.blocker_id = case when c.tenant_id = me.uid then coalesce(c.handler_id, c.owner_id) else c.tenant_id end)),
         case when c.tenant_id = me.uid then coalesce(c.handler_id, c.owner_id) else c.tenant_id end
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

revoke all on function public.hide_message(uuid), public.delete_message_for_everyone(uuid) from public, anon;
grant execute on function public.hide_message(uuid), public.delete_message_for_everyone(uuid) to authenticated;
