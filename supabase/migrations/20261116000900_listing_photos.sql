-- First few photos of many listings in one call, for the photo collage on listing cards.
create function public.listing_photos(p_ids uuid[], p_n integer default 3) returns table (listing_id uuid, paths text[])
language sql stable security invoker set search_path = public as $$
  select m.listing_id, (array_agg(m.path_960 order by m.position, m.created_at))[1:greatest(p_n, 1)]
  from public.listing_media m
  where m.listing_id = any (p_ids) and m.kind = 'photo'
  group by m.listing_id;
$$;
grant execute on function public.listing_photos(uuid[], integer) to anon, authenticated;
