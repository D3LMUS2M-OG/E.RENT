-- Profile pictures, and the data the WhatsApp-style chat list needs (avatars, who sent the last message, was it read).

-- ───────── Avatars: a public bucket, each person writes only inside their own folder ─────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "avatars insert own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars update own folder" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Public landlord view gains the picture (new column goes last)
create or replace view public.landlord_profiles with (security_invoker = false) as
select p.id, p.full_name as display_name, p.created_at as member_since, private.is_verified(p.id) as verified, p.avatar_url
from public.profiles p
where exists (select 1 from public.listings l where l.owner_id = p.id and l.status = 'active' and l.expires_at > now());
grant select on public.landlord_profiles to anon, authenticated;

-- ───────── Chat list ─────────
drop function public.unread_chat_count();
drop function public.my_conversations();
create function public.my_conversations() returns table (
  id uuid, listing_id uuid, listing_title text, listing_slug text, my_role text, other_name text,
  last_message_at timestamptz, last_preview text, unread integer, blocked boolean, other_user_id uuid,
  other_avatar text, last_from_me boolean, last_read boolean)
language sql stable security definer set search_path = '' as $$
  select c.id, c.listing_id, l.title, l.slug,
         case when c.tenant_id = me.uid then 'tenant' else 'landlord' end,
         case when c.tenant_id = me.uid then coalesce(nullif(hp.full_name, ''), op.full_name) else tp.full_name end,
         c.last_message_at,
         lm.preview,
         (select count(*)::int from public.messages m where m.conversation_id = c.id and m.read_at is null and m.deleted_for_everyone_at is null
            and not exists (select 1 from public.message_hides h where h.message_id = m.id and h.user_id = me.uid)
            and case when c.tenant_id = me.uid then m.sender_id <> c.tenant_id else m.sender_id = c.tenant_id end),
         exists (select 1 from public.blocks b where
            (b.blocker_id = me.uid and b.blocked_id = case when c.tenant_id = me.uid then coalesce(c.handler_id, c.owner_id) else c.tenant_id end)
            or (b.blocked_id = me.uid and b.blocker_id = case when c.tenant_id = me.uid then coalesce(c.handler_id, c.owner_id) else c.tenant_id end)),
         case when c.tenant_id = me.uid then coalesce(c.handler_id, c.owner_id) else c.tenant_id end,
         case when c.tenant_id = me.uid then (case when nullif(hp.full_name, '') is not null then hp.avatar_url else op.avatar_url end) else tp.avatar_url end,
         lm.sender_id = me.uid,
         lm.read_at is not null
  from public.conversations c
  cross join (select (select auth.uid()) as uid) me
  join public.listings l on l.id = c.listing_id
  join public.profiles tp on tp.id = c.tenant_id
  join public.profiles op on op.id = c.owner_id
  left join public.profiles hp on hp.id = c.handler_id
  left join lateral (
    select m.sender_id, m.read_at,
           case when m.deleted_for_everyone_at is not null then 'This message was deleted'
                else case m.kind when 'text' then left(m.body, 80) when 'image' then 'Photo' when 'voice' then 'Voice note' else 'Document' end end as preview
    from public.messages m
    where m.conversation_id = c.id
      and not exists (select 1 from public.message_hides h where h.message_id = m.id and h.user_id = me.uid)
    order by m.created_at desc limit 1) lm on true
  where (c.tenant_id = me.uid and c.tenant_deleted_at is null)
     or ((c.owner_id = me.uid or private.is_delegate_of(c.owner_id)) and c.landlord_deleted_at is null)
  order by c.last_message_at desc limit 200;
$$;

create function public.unread_chat_count() returns integer language sql stable security definer set search_path = '' as $$
  select count(distinct other_user_id)::int from public.my_conversations() where unread > 0 and not blocked;
$$;

drop function public.chat_overview(uuid);
create function public.chat_overview(p_id uuid) returns table (
  id uuid, listing_id uuid, listing_title text, listing_slug text, listing_status text, my_role text, other_name text,
  other_verified boolean, tenant_id uuid, other_user_id uuid, i_blocked boolean, blocked_me boolean, other_avatar text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.listing_id, l.title, l.slug, l.status::text,
         case when c.tenant_id = me.uid then 'tenant' else 'landlord' end,
         case when c.tenant_id = me.uid then coalesce(nullif(hp.full_name, ''), op.full_name) else tp.full_name end,
         case when c.tenant_id = me.uid then private.is_verified(c.owner_id) else false end,
         c.tenant_id,
         case when c.tenant_id = me.uid then coalesce(c.handler_id, c.owner_id) else c.tenant_id end,
         exists (select 1 from public.blocks b where b.blocker_id = me.uid and b.blocked_id = case when c.tenant_id = me.uid then coalesce(c.handler_id, c.owner_id) else c.tenant_id end),
         exists (select 1 from public.blocks b where b.blocked_id = me.uid and b.blocker_id = case when c.tenant_id = me.uid then coalesce(c.handler_id, c.owner_id) else c.tenant_id end),
         case when c.tenant_id = me.uid then (case when nullif(hp.full_name, '') is not null then hp.avatar_url else op.avatar_url end) else tp.avatar_url end
  from public.conversations c
  cross join (select (select auth.uid()) as uid) me
  join public.listings l on l.id = c.listing_id
  join public.profiles tp on tp.id = c.tenant_id
  join public.profiles op on op.id = c.owner_id
  left join public.profiles hp on hp.id = c.handler_id
  where c.id = p_id and private.is_chat_participant(c.id);
$$;

revoke all on function public.my_conversations(), public.unread_chat_count(), public.chat_overview(uuid) from public, anon;
grant execute on function public.my_conversations(), public.unread_chat_count(), public.chat_overview(uuid) to authenticated;
