-- Step 13: the tenant's move-in checklist, saved per rental (or one general list per person).
create table public.move_in_checklists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid references public.rental_requests(id) on delete set null,
  done text[] not null default '{}' check (cardinality(done) <= 100),
  notes text not null default '' check (char_length(notes) <= 4000),
  updated_at timestamptz not null default now()
);
create unique index move_in_checklists_one on public.move_in_checklists (user_id, coalesce(request_id, '00000000-0000-0000-0000-000000000000'::uuid));
alter table public.move_in_checklists enable row level security;
create policy move_in_checklists_own on public.move_in_checklists for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
