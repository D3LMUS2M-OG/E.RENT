# This build: theme fix, glass pills, Google and phone sign-in, Google Maps, landing page

## Do this first
1. `npm install` (maplibre-gl is removed; `@googlemaps/markerclusterer` and `@types/google.maps` are added), then `npm run typecheck`.
2. Vercel: add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to **Preview** as well as Production, then redeploy.
3. Google Cloud: the key must allow the Maps JavaScript API. Add your live address with `/*` (for example `https://e-rent-d3lmus2m-og.vercel.app/*`) and `http://localhost:3000/*` under website restrictions.
4. Supabase, Authentication, URL Configuration: Site URL is the live address; Redirect URLs include `<live address>/auth/callback`.
5. No new SQL migration is needed.

## Sign-in
- Google and phone buttons always show on /sign-in and /sign-up. Phone lives at /phone (sign in or sign up, 6-digit code).
- First-time Google or phone users get a one-time "tenant or landlord" step at /onboarding.
- If Google fails, check the Client ID and secret in Supabase and that `<supabase project url>/auth/v1/callback` is an authorised redirect URI in Google Cloud.
- Phone codes go through your custom SMS hook. In sign-in mode unknown numbers are told to sign up.

## Landing page notes
- The Kenya map is a dot map: one dot per county at its real position (from your sub-county data). Real county outlines were not in this project, so I did not fake them.
- Numbers (houses, verified landlords) are live from the database. Landlord star ratings appear once reviews (Step 10) exist.
- Family photos are in /public/landing.

## Round 2 fixes
- Dropdowns (Counties, House types, theme, dialogs) now use `.glass-solid`: about 96% opaque, strong blur, full-contrast text. Blur nested inside the header pill does not render in browsers, so the panels no longer depend on it.
- Hero: Kenya outline filled with rounded photo tiles (plain SVG images, sharp). The outline is a simplified drawing, not a survey boundary. The county dot map keeps a faint outline under the dots.
- Footer sticks to the bottom on short pages (body is a flex column, main grows).
- Desktop bottom pill stays hidden at the top of the page and appears when you scroll up.
- Removed repeats: hero county chips, student housing card, footer county list, duplicate footer links. Walkthrough section appears only when videos exist.

## Round 3: real county map
- `lib/kenya-geo.ts` is generated from your ke.json (47 county shapes plus the country outline, about 50 KB). The 10 MB original is not shipped.
- The hero collage is clipped to the real Kenya outline. "Browse by county" is now the full county map: hover or tap a county, click to open its houses.

## Round 4
- Map error on desktop: the loader used Google's `loading=async` mode, which hides `google.maps.Map` until `importLibrary` is called. Fixed. If Google rejects the key for your address, the map now says so and names the address to add under the key's website restrictions (use the address you actually open, for example https://e-rent-og.vercel.app/*).
- Bottom pill is phones only (hidden from 768px up).
- Hero: three pre-cropped 3x tiles (public/landing/tile-*.webp) with faces centred in the part of each tile that sits inside Kenya. Floating badges removed.
- Sign-in and sign-out now update the header and tabs straight away: the session is re-read after every page change and when the tab regains focus.

## Step 10: reviews and ratings
1. Run `supabase/migrations/20261118001100_reviews.sql` in the Supabase SQL editor. It creates the review tables, the `review-photos` bucket, the `submit_review`, `reply_to_review` and `my_reviewable` functions, and the public views.
2. Tenants: My requests shows "Review your home" (after the landlord confirms and you accept) or "Review your viewing" (after you mark a viewing done). One review per rental or viewing.
3. Reviews show on the listing page (summary, category averages, photos, landlord reply) and on the new public landlord profile at /landlord/<id>.
4. Landlords: Dashboard, Reviews. Owners and active delegates can reply publicly; replies carry a "Landlord reply" badge.
5. Landing page landlord cards now link to the profile and show stars once a landlord has reviews.
6. Reviews are public, show first name and initial only, and are not edited. Staff with the `review.delete` permission can delete one in the database; there is no admin screen for it yet.
Not in this step: landlord response time on the profile (needs chat timing), landlord ratings of tenants (P1), review notifications (Step 12), and stars on search cards.

## Review fixes
- Run `supabase/migrations/20261118001200_fix_submit_review.sql` (fixes "column reference tour_id is ambiguous" when posting a review). If you never ran the first reviews migration, the fixed function is already in it.
- Landlords now find their own tenant requests at Dashboard, My requests (/dashboard/my-requests). The dashboard's landlord inbox is renamed "Incoming requests". The listing page and account menu send landlords to the dashboard version.

## Review photos and updates
- Run `supabase/migrations/20261118001300_review_updates_and_photos.sql` after the earlier two.
- Photos go to the public Storage bucket `review-photos` (folder = your user id / review id) and are listed in the `review_photos` table. They show under the review on the listing page and the landlord profile. The old insert rule counted every photo on the site, so inserts stopped after a few; fixed. If a photo still fails, the form now says so instead of hiding it.
- Tenants can post an update on the same stay 7 days after their last review (change the interval in `submit_review` and `my_reviewable`). Updates are labelled "Update", all reviews stay visible, and the averages use each tenant's newest review of a stay.

## Step 12: notifications
1. Run `supabase/migrations/20261119001400_notifications.sql`.
2. In-app notifications work straight away (bell in the top bar, /account/notifications). Email and WhatsApp need the worker:
   - Vercel env: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `RESEND_API_KEY`, `NOTIFY_FROM` (an address on a domain verified in Resend; until then Resend only lets you send to your own email), and for WhatsApp `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME` (approved template with two body variables).
   - Call `GET https://<your site>/api/cron/notifications` with header `Authorization: Bearer <CRON_SECRET>` every 5 minutes. On Vercel Pro add `{ "path": "/api/cron/notifications", "schedule": "*/5 * * * *" }` to `vercel.json`. On the free Hobby plan Vercel only allows daily crons and would reject the deploy, so use a free pinger such as cron-job.org with that header instead.
3. Events covered: request received and decided, rental to confirm and confirmed, review received and replied to, verification result, listing taken down, warnings and other account actions, unread chat messages (after 5 minutes, skipped if read), listings expiring (15 and 5 days left, queued daily at 01:30 by pg_cron).
4. Each person chooses In the app, Email and WhatsApp under Account, Notifications. Failed sends retry after 2, 4, 8 and 16 minutes, then show as failed in Admin, Notifications, which also shows what is not set up.
5. Not included yet: saved-search alerts (saved searches are not built), push notifications, SMS (Step 17).

## Step 11 (rest): analytics and admin tools
Run `supabase/migrations/20261120001500_analytics_and_staff.sql`.
- Landlord dashboard overview now shows views, new chats, saved and requests for the last 30 days, a views-per-day chart and a per-listing table. Views are counted once per browser per listing per day, with no personal data.
- Admin, Analytics: people, landlords, requests, rentals, chats, reviews, house views, listings by status and county, sign-ups per week.
- Admin, Platform data: add, rename, hide and show house types and amenities (needs the `data.manage` permission).
- Admin, Settings: feature flags as switches (super admin only, each change logged).
- Admin, Staff (super admin only): add a team member by email with a role, remove roles. The last super admin cannot be removed.
- Admin, Audit log: all staff actions, newest first, filterable.

## Step 13 (part 1): saved searches, alerts and the personal feed
Run `supabase/migrations/20261121001600_saved_searches_feed.sql`.
- Search page: "Save this search" (visitors are sent to sign in first). Up to 20 saved searches per person.
- Account menu, Saved searches: open, turn alerts on or off, delete. A database job checks every hour (pg_cron) and sends a notification when new houses match since the last check. It uses the notification channels from Step 12, so email and WhatsApp work once the worker is scheduled.
- Account menu, My feed (/account/feed): choose up to 5 counties, house types, a budget and bedrooms; the page lists the newest matches. Signed-in people also see "Houses picked for you" under the home page search.
- Left for the rest of Step 13: price insights, compare, neighbourhood and reliability info, student mode, rental agreement generator, move-in checklist.
