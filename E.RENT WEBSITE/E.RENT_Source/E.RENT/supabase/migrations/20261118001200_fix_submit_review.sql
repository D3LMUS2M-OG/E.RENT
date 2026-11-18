-- Fix for submit_review: its variables shared names with table columns ("tour_id is ambiguous"). Safe to run even if the first version ran.
create or replace function public.submit_review(
  p_request_id uuid, p_overall int, p_condition int, p_accuracy int, p_responsiveness int, p_water int, p_security int, p_neighbourhood int, p_body text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_listing uuid; v_rental uuid; v_tour uuid; v_owner uuid; v_new uuid; v_kind text;
begin
  if v_me is null then raise exception 'Sign in first'; end if;
  select r.listing_id into v_listing from public.rental_requests r where r.id = p_request_id and r.tenant_id = v_me;
  if not found then raise exception 'That request is not yours'; end if;
  select x.id into v_rental from public.rentals x where x.request_id = p_request_id and x.status = 'confirmed' order by x.created_at desc limit 1;
  select t.id into v_tour from public.tours t where t.request_id = p_request_id;
  if v_rental is null and v_tour is null then
    raise exception 'You can review a house after a confirmed rental or a completed viewing';
  end if;
  if exists (select 1 from public.reviews v where (v_rental is not null and v.rental_id = v_rental) or (v_tour is not null and v.tour_id = v_tour)) then
    raise exception 'You have already reviewed this house';
  end if;
  select l.owner_id into v_owner from public.listings l where l.id = v_listing;
  v_kind := case when v_rental is not null then 'rental' else 'tour' end;
  insert into public.reviews (listing_id, landlord_id, author_id, rental_id, tour_id, kind, overall, r_condition, r_accuracy, r_responsiveness, r_water, r_security, r_neighbourhood, body)
  values (v_listing, v_owner, v_me, case when v_kind = 'rental' then v_rental end, case when v_kind = 'tour' then v_tour end, v_kind,
          p_overall, p_condition, p_accuracy, p_responsiveness, p_water, p_security, p_neighbourhood, btrim(p_body))
  returning id into v_new;
  return v_new;
end $$;
revoke all on function public.submit_review(uuid, int, int, int, int, int, int, int, text) from public, anon;
grant execute on function public.submit_review(uuid, int, int, int, int, int, int, int, text) to authenticated;
