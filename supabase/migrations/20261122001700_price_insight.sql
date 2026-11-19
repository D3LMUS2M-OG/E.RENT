-- Step 13: price insights. How a listing's rent compares with similar houses nearby.
-- Looks at live listings of the same house type, widening from the estate, to the sub-county, to the county, and only speaks when it has at least 5 houses to compare.
create function public.price_insight(p_listing uuid)
returns table (scope text, area text, n integer, p25 integer, median integer, p75 integer, rent integer)
language plpgsql stable security definer set search_path = '' as $$
declare
  l record; sc text; v_n integer; v_p25 numeric; v_med numeric; v_p75 numeric; v_area text;
begin
  select li.rent, li.property_type_id, p.county_id, p.sub_county, p.estate, c.name as county
    into l
    from public.listings li join public.properties p on p.id = li.property_id join public.counties c on c.id = p.county_id
   where li.id = p_listing and li.status = 'active' and li.expires_at > now();
  if not found then return; end if;

  foreach sc in array array['estate', 'sub_county', 'county'] loop
    if sc = 'estate' and nullif(btrim(l.estate), '') is null then continue; end if;
    if sc = 'sub_county' and nullif(btrim(l.sub_county), '') is null then continue; end if;
    select count(*)::int,
           percentile_cont(0.25) within group (order by x.rent), percentile_cont(0.5) within group (order by x.rent), percentile_cont(0.75) within group (order by x.rent)
      into v_n, v_p25, v_med, v_p75
      from public.listings x join public.properties q on q.id = x.property_id
     where x.status = 'active' and x.expires_at > now() and x.property_type_id = l.property_type_id and q.county_id = l.county_id
       and (sc = 'county' or (sc = 'sub_county' and lower(q.sub_county) = lower(l.sub_county)) or (sc = 'estate' and lower(q.estate) = lower(l.estate)));
    if v_n >= 5 then
      v_area := case sc when 'estate' then l.estate when 'sub_county' then l.sub_county else l.county end;
      return query select sc, v_area, v_n, round(v_p25)::int, round(v_med)::int, round(v_p75)::int, l.rent;
      return;
    end if;
  end loop;
end $$;
revoke all on function public.price_insight(uuid) from public;
grant execute on function public.price_insight(uuid) to anon, authenticated;
