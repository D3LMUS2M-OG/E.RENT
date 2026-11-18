-- Step 13 (first part): saved searches with alerts, and the personal feed preferences.

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  query text not null check (char_length(query) <= 1000),     -- the search page's URL query, so "Open" and alert links go to the same results
  filters jsonb not null default '{}',                         -- the same filters as the search function expects
  alert boolean not null default true,
  last_checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, query)
);
create index on public.saved_searches (user_id, created_at desc);
create index saved_searches_alert_idx on public.saved_searches (last_checked_at) where alert;
alter table public.saved_searches enable row level security;
create policy saved_searches_own on public.saved_searches for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create function private.limit_saved_searches() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.saved_searches where user_id = new.user_id) >= 20 then
    raise exception 'You can keep up to 20 saved searches. Delete one first.';
  end if;
  return new;
end $$;
create trigger limit_saved_searches before insert on public.saved_searches for each row execute function private.limit_saved_searches();

create table public.feed_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  counties text[] not null default '{}' check (cardinality(counties) <= 5),
  types text[] not null default '{}' check (cardinality(types) <= 10),
  max_rent integer check (max_rent is null or max_rent > 0),
  min_bedrooms smallint check (min_bedrooms is null or min_bedrooms between 0 and 10),
  updated_at timestamptz not null default now()
);
alter table public.feed_preferences enable row level security;
create policy feed_preferences_own on public.feed_preferences for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ───────── Alerts: hourly, tell each person about houses published since we last looked ─────────
create function private.run_saved_search_alerts() returns integer language plpgsql security definer set search_path = '' as $$
declare s record; v_new integer; v_titles text[]; v_sent integer := 0; v_body text;
begin
  for s in select * from public.saved_searches where alert order by last_checked_at limit 500 loop
    select count(*), (array_agg(q.title order by q.published_at desc))[1:3]
      into v_new, v_titles
      from (select x.title, x.published_at from public.search_listings(s.filters || jsonb_build_object('sort', 'newest', 'limit', 50, 'offset', 0)) x where x.published_at > s.last_checked_at) q;
    if v_new > 0 then
      v_body := array_to_string(v_titles, ', ') || case when v_new > 3 then ' and ' || (v_new - 3) || ' more' else '' end;
      perform private.notify(s.user_id, 'search_alert',
        case when v_new = 1 then '1 new house matches "' else v_new || ' new houses match "' end || left(s.name, 60) || '"',
        v_body, '/search?' || s.query, 'alert:' || s.id || ':' || to_char(now(), 'YYYYMMDDHH24'));
      v_sent := v_sent + 1;
    end if;
    update public.saved_searches set last_checked_at = now() where id = s.id;
  end loop;
  return v_sent;
end $$;
revoke all on function private.run_saved_search_alerts() from public, anon, authenticated;
do $$ begin
  perform cron.schedule('saved-search-alerts', '5 * * * *', 'select private.run_saved_search_alerts()');
exception when others then
  raise notice 'pg_cron not scheduled (enable it in Database > Extensions, then run the cron.schedule line): %', sqlerrm;
end $$;
