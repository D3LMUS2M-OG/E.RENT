-- All 47 counties. Sub-counties and wards must come from IEBC data (about 290 constituencies and 1,450 wards):
-- load them with a CSV import script in Step 3b. They are not typed here to avoid wrong data.
insert into public.counties (id, name, slug)
select code, name, lower(regexp_replace(replace(name, '''', ''), '\s+', '-', 'g'))
from unnest(array[
  'Mombasa','Kwale','Kilifi','Tana River','Lamu','Taita-Taveta','Garissa','Wajir','Mandera','Marsabit',
  'Isiolo','Meru','Tharaka-Nithi','Embu','Kitui','Machakos','Makueni','Nyandarua','Nyeri','Kirinyaga',
  'Murang''a','Kiambu','Turkana','West Pokot','Samburu','Trans Nzoia','Uasin Gishu','Elgeyo-Marakwet',
  'Nandi','Baringo','Laikipia','Nakuru','Narok','Kajiado','Kericho','Bomet','Kakamega','Vihiga','Bungoma',
  'Busia','Siaya','Kisumu','Homa Bay','Migori','Kisii','Nyamira','Nairobi'
]) with ordinality as t(name, code);
