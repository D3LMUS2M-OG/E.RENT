-- Step 12: notifications. Events become an in-app notification (immediately) and an outbox row that a worker sends by email or WhatsApp,
-- applying each person's channel choices, with retries.

create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email boolean not null default true,
  in_app boolean not null default true,
  whatsapp boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;
create policy prefs_own_select on public.notification_preferences for select to authenticated using (user_id = (select auth.uid()));
create policy prefs_own_insert on public.notification_preferences for insert to authenticated with check (user_id = (select auth.uid()));
create policy prefs_own_update on public.notification_preferences for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event text not null,
  title text not null,
  body text not null default '',
  url text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
alter table public.notifications enable row level security;
create policy notifications_own_select on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_own_update on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_own_delete on public.notifications for delete to authenticated using (user_id = (select auth.uid()));
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;   -- people can only mark theirs as read

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event text not null,
  title text not null,
  body text not null default '',
  url text,
  payload jsonb not null default '{}',
  dedupe_key text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  attempts smallint not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create unique index outbox_pending_dedupe on public.notification_outbox (dedupe_key) where dedupe_key is not null and status = 'pending';
create index outbox_due_idx on public.notification_outbox (next_attempt_at) where status = 'pending';
create index outbox_status_idx on public.notification_outbox (status, created_at desc);
alter table public.notification_outbox enable row level security;   -- no policies: only the server worker (service role) and these functions touch it
revoke all on public.notification_outbox from anon, authenticated;

-- ───────── The one function every event goes through ─────────
create function private.notify(
  p_user uuid, p_event text, p_title text, p_body text, p_url text,
  p_dedupe text default null, p_payload jsonb default '{}', p_delay interval default '0 minutes', p_in_app boolean default true
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null then return; end if;
  if p_in_app and coalesce((select np.in_app from public.notification_preferences np where np.user_id = p_user), true) then
    insert into public.notifications (user_id, event, title, body, url) values (p_user, p_event, p_title, coalesce(p_body, ''), p_url);
  end if;
  insert into public.notification_outbox (user_id, event, title, body, url, payload, dedupe_key, next_attempt_at)
  values (p_user, p_event, p_title, coalesce(p_body, ''), p_url, p_payload, p_dedupe, now() + p_delay)
  on conflict (dedupe_key) where dedupe_key is not null and status = 'pending' do nothing;
end $$;
revoke all on function private.notify(uuid, text, text, text, text, text, jsonb, interval, boolean) from public, anon, authenticated;

create function private.person(p_id uuid, p_fallback text default 'Someone') returns text language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(btrim((select full_name from public.profiles where id = p_id)), ''), p_fallback);
$$;
revoke all on function private.person(uuid, text) from public, anon, authenticated;

-- 1. A request arrives (landlord) ------------------------------------------------------------
create function private.tg_notify_request_created() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_owner uuid; v_title text;
begin
  select l.owner_id, l.title into v_owner, v_title from public.listings l where l.id = new.listing_id;
  perform private.notify(v_owner, 'request_received',
    case when new.kind = 'apply' then 'New application to rent' else 'New viewing request' end,
    private.person(new.tenant_id, 'A tenant') || ' sent a request for ' || v_title || '.', '/dashboard/requests');
  return new;
end $$;
create trigger notify_request_created after insert on public.rental_requests for each row execute function private.tg_notify_request_created();

-- 2. The landlord decides (tenant) -----------------------------------------------------------
create function private.tg_notify_request_decided() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_title text;
begin
  if old.status = 'pending' and new.status in ('accepted', 'declined') then
    select l.title into v_title from public.listings l where l.id = new.listing_id;
    perform private.notify(new.tenant_id, 'request_decided',
      case when new.status = 'accepted' then 'Your request was accepted' else 'Your request was declined' end,
      v_title || coalesce(': ' || nullif(new.decision_note, ''), '.'), '/account/requests');
  end if;
  return new;
end $$;
create trigger notify_request_decided after update of status on public.rental_requests for each row execute function private.tg_notify_request_decided();

-- 3. Rental confirmation (tenant asked to accept, landlord told when they do) -----------------------
create function private.tg_notify_rental_proposed() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_title text;
begin
  select l.title into v_title from public.listings l where l.id = new.listing_id;
  perform private.notify(new.tenant_id, 'rental_proposed', 'Confirm your rental', 'The landlord marked ' || v_title || ' as rented to you. Open My requests to accept.', '/account/requests');
  return new;
end $$;
create trigger notify_rental_proposed after insert on public.rentals for each row execute function private.tg_notify_rental_proposed();

create function private.tg_notify_rental_confirmed() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_owner uuid; v_title text;
begin
  if old.status = 'proposed' and new.status = 'confirmed' then
    select l.owner_id, l.title into v_owner, v_title from public.listings l where l.id = new.listing_id;
    perform private.notify(v_owner, 'rental_confirmed', 'Rental confirmed', private.person(new.tenant_id, 'The tenant') || ' accepted the rental of ' || v_title || '.', '/dashboard/requests');
  end if;
  return new;
end $$;
create trigger notify_rental_confirmed after update of status on public.rentals for each row execute function private.tg_notify_rental_confirmed();

-- 4. Reviews and replies ------------------------------------------------------------------------
create function private.tg_notify_review() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_title text;
begin
  select l.title into v_title from public.listings l where l.id = new.listing_id;
  perform private.notify(new.landlord_id, 'review_received', 'New review: ' || new.overall || ' out of 5', v_title, '/dashboard/reviews');
  return new;
end $$;
create trigger notify_review after insert on public.reviews for each row execute function private.tg_notify_review();

create function private.tg_notify_reply() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_author uuid; v_slug text; v_title text;
begin
  select r.author_id, l.slug, l.title into v_author, v_slug, v_title from public.reviews r join public.listings l on l.id = r.listing_id where r.id = new.review_id;
  perform private.notify(v_author, 'review_reply', 'The landlord replied to your review', v_title, '/listing/' || v_slug || '#reviews');
  return new;
end $$;
create trigger notify_reply after insert on public.review_replies for each row execute function private.tg_notify_reply();

-- 5. Verification result -------------------------------------------------------------------------
create function private.tg_notify_verification() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status is distinct from new.status and new.status in ('approved', 'rejected') then
    perform private.notify(new.user_id, 'verification_result',
      case when new.status = 'approved' then 'You are verified' else 'Verification needs changes' end,
      case when new.status = 'approved' then 'The blue Verified badge now shows on your profile and listings.' else coalesce(nullif(new.reject_reason, ''), 'Open Verification to see what to fix and send it again.') end,
      '/dashboard/verification');
  end if;
  return new;
end $$;
create trigger notify_verification after update of status on public.landlord_verifications for each row execute function private.tg_notify_verification();

-- 6. Moderation: a listing taken down, a warning or other action on an account ---------------------
create function private.tg_notify_takedown() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status is distinct from new.status and new.status = 'taken_down' then
    perform private.notify(new.owner_id, 'listing_taken_down', 'A listing was taken down', new.title || ' did not meet the listing standards. Open it to see what to fix.', '/dashboard/listings');
  end if;
  return new;
end $$;
create trigger notify_takedown after update of status on public.listings for each row execute function private.tg_notify_takedown();

create function private.tg_notify_sanction() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.notify(new.user_id, 'moderation_action',
    case new.kind when 'warning' then 'You received a warning' when 'summons' then 'You have been summoned' when 'suspension' then 'Your account was suspended' else 'Your account was banned' end,
    new.reason, '/account');
  return new;
end $$;
create trigger notify_sanction after insert on public.user_sanctions for each row execute function private.tg_notify_sanction();

-- 7. A chat message the other person has not read after a few minutes --------------------------------------
-- No in-app copy (the chat badge covers it). The worker skips it if the conversation was read in the meantime.
create function private.tg_notify_message() returns trigger language plpgsql security definer set search_path = '' as $$
declare c record; v_to uuid;
begin
  select tenant_id, owner_id, handler_id into c from public.conversations where id = new.conversation_id;
  if not found then return new; end if;
  v_to := case when new.sender_id = c.tenant_id then coalesce(c.handler_id, c.owner_id) else c.tenant_id end;
  if v_to is null or v_to = new.sender_id then return new; end if;
  perform private.notify(v_to, 'chat_message', 'New message from ' || private.person(new.sender_id, 'someone'),
    coalesce(left(new.body, 120), 'Sent you an attachment'), '/chats/' || new.conversation_id,
    'chat:' || new.conversation_id || ':' || v_to, jsonb_build_object('conversation_id', new.conversation_id, 'recipient_id', v_to),
    interval '5 minutes', false);
  return new;
end $$;
create trigger notify_message after insert on public.messages for each row execute function private.tg_notify_message();

-- 8. Listings about to expire (15 and 5 days left = day 75 and day 85 of 90) ----------------------------------
create function private.queue_expiry_reminders() returns integer language plpgsql security definer set search_path = '' as $$
declare r record; n integer := 0; k text;
begin
  for r in select l.id, l.owner_id, l.title, (l.expires_at::date - current_date) as days from public.listings l
           where l.status = 'active' and (l.expires_at::date - current_date) in (15, 5) loop
    k := 'expiry:' || r.id || ':' || r.days;
    if not exists (select 1 from public.notification_outbox o where o.dedupe_key = k) then
      perform private.notify(r.owner_id, 'listing_expiring', 'Your listing expires in ' || r.days || ' days', r.title || '. Renew it to keep it live.', '/dashboard/listings', k);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke all on function private.queue_expiry_reminders() from public, anon, authenticated;
do $$ begin
  perform cron.schedule('expiry-reminders', '30 1 * * *', 'select private.queue_expiry_reminders()');
exception when others then
  raise notice 'pg_cron not scheduled (enable it in Database > Extensions, then run the cron.schedule line): %', sqlerrm;
end $$;

-- ───────── For the worker only: take due rows, push their next try 10 minutes out (a lease), let several workers run at once ─────────
create function public.claim_outbox(p_limit int default 25) returns setof public.notification_outbox
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with due as (select id from public.notification_outbox where status = 'pending' and next_attempt_at <= now() order by next_attempt_at limit p_limit for update skip locked)
  update public.notification_outbox o set attempts = o.attempts + 1, next_attempt_at = now() + interval '10 minutes' from due where o.id = due.id returning o.*;
end $$;
revoke all on function public.claim_outbox(int) from public, anon, authenticated;
grant execute on function public.claim_outbox(int) to service_role;
