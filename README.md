# E.Rent

Kenya-wide rental marketplace. Next.js 16 (App Router) on Vercel, Supabase for Postgres, Auth, Realtime and Storage. See the PRD, ARD and Build Plan.

## Built so far

| Step | Status |
| --- | --- |
| 0 Foundations, 1 Design system | Done (first pass). New logo from the supplied artwork, used as a CSS mask so one file is black on light and white on dark |
| 3 Database foundation | Done: geography, profiles, roles, organisations, delegations, flags, staff permissions, audit log, RLS everywhere |
| 4 App shell and auth | Email and password. `/account` page. `/admin` (staff only, others get 404) |
| 5 Verification, delegation | Done: landlord document upload to a private bucket, verifier review with audited document opens, approve, reject with reason, revoke, delete documents after decision, Verified badge on listings and search; caretaker and agent invitation by email, accept or decline, revoke, caretaker listings wait for landlord approval |
| Geography | Done: 47 counties, 304 sub-counties, 1,450 wards from your shapefiles (cleaned names, approximate centres). County, sub-county, ward pickers, ward suggested from the pin, sub-county and ward SEO pages |
| 6 Listings and media | Done: wizard-style form, exact pin, 3 to 7 photos plus one video, direct signed uploads, WebP variants, blur placeholder, optional watermark, 90-day expiry job, pause/rent/relist/renew, caretaker approval rule, duplicate flags |
| 7 Search and discovery | Done: one SQL function with the filters below, near me, list and clustered map views, favourites, WhatsApp share button, county pages, sitemap. Not done: saved searches and alerts, personal feed (they need Step 12 notifications) |
| 11 (part) | Moderation page: flags queue, take down with reason, restore, all audit-logged |

Search filters live now: county, sub-county, estate, words, rent, deposit, property type, bedrooms, bathrooms, size, floor, available-by date, amenities (includes furnished, pets, parking, water), managed by owner or caretaker, posted within days, near me, sorting. Verified-only, minimum rating, and water, power and road reliability arrive with Steps 5, 10 and 13.

## Set up the database (order matters)

Your project was created from a different foundation script, so reset those objects first.

1. `supabase/scripts/00_reset_divergent_foundation.sql` (SQL Editor)
2. `supabase/migrations/20261108000100_foundation.sql`
3. `supabase/seed.sql`
4. `supabase/migrations/20261109000200_listings.sql`
5. `supabase/migrations/20261110000300_verification_geo.sql`
6. `supabase/seed_geography.sql` (140 KB. If the SQL Editor is slow, split it at the `insert into _wd values` line, or run it with psql)
7. `supabase/scripts/01_backfill_existing_users.sql` (creates your profile and role rows and makes you super admin)
8. Dashboard > Authentication > Hooks > Custom Access Token > `public.custom_access_token_hook` (optional: the app reads roles from the database)
9. Dashboard > Database > Extensions: enable `pg_cron` if step 4 printed a notice about it, then run the `cron.schedule` line from the migration.

## Run it

```bash
npm install
cp .env.example .env.local   # Supabase URL and publishable key
npm run dev
npm run typecheck && npm test
```

## Known limits

- Written without network access: never installed, built or run. Expect small fixes on first `npm install && npm run typecheck`.
- Ward centres are polygon centres of mass, so "suggested from the pin" can be wrong near boundaries. The landlord can always change it. `scripts/build_geography.py` rebuilds the seed from the shapefiles.
- Keep email confirmation ON in production: caretaker invitations are accepted by email address, and the database only lets a confirmed email accept.
- Organisation accounts for property management companies (ACC-8) are not built yet.
- Verification documents are deleted by a verifier after a decision. Set the retention rule with your advocate and the ODPC before launch.
- A verifier cannot decide their own application, so the first super admin needs a second staff member to be verified.
- Multi-unit buildings use counts (`units_total`, `units_available`) and a "mark one unit rented" action, not one row per unit.
- The public map uses OpenStreetMap's tile server. Switch to a proper OSM-based provider before launch.
- Landlord names show on a listing through a limited public view (name, member-since, verified) for landlords with a live listing.
- `proxy.ts` replaces `middleware.ts` in Next.js 16.
