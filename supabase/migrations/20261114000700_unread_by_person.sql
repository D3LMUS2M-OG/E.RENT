-- Unread badges count people, like WhatsApp: the header shows how many people wrote to you,
-- and each chat row shows how many unread messages that one person sent.

drop function public.unread_chat_count();
drop function public.my_conversations();

create function public.my_conversations() returns table (
  id uuid, listing_id uuid, listing_title text, listing_slug text, my_role text, other_name text,
  last_message_at timestamptz, last_preview text, unread integer, blocked boolean, other_user_id uuid)
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

-- Number of different people with unread messages (a person who wrote 100 messages counts once).
create function public.unread_chat_count() returns integer language sql stable security definer set search_path = '' as $$
  select count(distinct other_user_id)::int from public.my_conversations() where unread > 0 and not blocked;
$$;

revoke all on function public.my_conversations(), public.unread_chat_count() from public, anon;
grant execute on function public.my_conversations(), public.unread_chat_count() to authenticated;
