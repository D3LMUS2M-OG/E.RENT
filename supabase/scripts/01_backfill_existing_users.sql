-- RUN AFTER the foundation migration and seed.sql.
-- Users who signed up before the new-user trigger existed have no profile or role rows.
insert into public.profiles (id, full_name)
select id, coalesce(raw_user_meta_data ->> 'full_name', '') from auth.users
on conflict (id) do nothing;

insert into public.user_roles (user_id, role)
select id, 'tenant' from auth.users
on conflict do nothing;

-- Super admin (your user id). Edit the id if you use a different account.
insert into public.staff_roles (user_id, role)
values ('4b455217-1638-4839-baa6-e493a32727ba', 'super_admin')
on conflict do nothing;

-- Check
select u.email, array_agg(distinct ur.role) as roles, array_agg(distinct sr.role) filter (where sr.role is not null) as staff
from auth.users u
left join public.user_roles ur on ur.user_id = u.id
left join public.staff_roles sr on sr.user_id = u.id
group by u.email;
