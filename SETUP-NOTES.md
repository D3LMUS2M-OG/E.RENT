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

## Step 13 (part 2): price insights and compare
Run `supabase/migrations/20261122001700_price_insight.sql`.
- Listing page: "How the rent compares" shows the typical range (25th to 75th percentile), the middle, and a marker for this house, with a plain-words verdict. It compares live houses of the same type, widening from the estate to the sub-county to the county, and only shows when there are at least 5 to compare. It is calculated live by a function rather than a daily materialised view, so it is never a day out of date; at tens of thousands of listings we can switch to a view.
- Compare: tap Compare under 2 to 4 house cards; a floating button opens /compare with the houses side by side (rent, deposit, type, area, rooms, size, floor, availability, landlord verified, rating, price verdict and every amenity as Yes or No). The list is kept in the browser.
- Still to do in Step 13: neighbourhood and reliability info, student housing mode, rental agreement generator, move-in checklist.

## Step 13 (part 3): move-in checklist and rental agreement
Run `supabase/migrations/20261123001800_checklist.sql`.
- Tenants: Account menu, Move-in checklist (/account/checklist). 28 checks in 6 groups (water, power, security, condition, money and paperwork, handover) with tips, a progress bar, notes, autosave, and print or save as PDF. A confirmed rental in My requests links to its own copy (/account/checklist?request=...).
- Landlords: Dashboard, Agreements. Pick one of your houses to fill the details, or type them, and the tenancy agreement updates as you type (rent, deposit, due day, start, length, notice, utilities, pets, extra terms, signature and witness blocks). Print or save as PDF. Nothing typed there is stored, so no ID numbers or personal data leave the browser.
- The agreement is a plain template and says it is not legal advice and that E.Rent is not a party. Please have your advocate review the wording before launch (this is in Step 14).
- Still to do in Step 13: neighbourhood info and estate reliability ratings, student housing mode.

## Step 13 (part 4, finishes Step 13): neighbourhood, reliability and student mode
Run `supabase/migrations/20261124001900_neighbourhood_reliability.sql`. It replaces `submit_review` with a version that also takes power and road ratings, and turns student mode on (switch it off in Admin, Settings).
- Landlords: Edit listing now has "What is nearby" (schools, clinics, matatu stages, shops, places of worship, with minutes on foot, up to 15). Tenants see it as "Nearby" on the listing page.
- Reviews now also rate power supply and road access. The listing page shows "How reliable is the area?" (water, power, roads, security) from tenants' newest reviews in the same estate, widening to the sub-county or county, once at least 3 reviews exist.
- Student housing (/student-housing): 18 universities, each with 1, 3 and 5 km links that open the search near the campus, nearest first. Campus coordinates are approximate. If the flag is off the page redirects to the student housing search.
- The old reviews migration columns still work; reviews written before this simply have no power or road score.
- Step 13 is now complete. Remaining from the plan: small gaps (landlord response time and availability hours, landlords rating tenants, county sub-pages and estate pages, delete my account, admin review removal, staff two-factor), then Steps 14 to 17.

## Final build: gaps, legal, quality and launch
Run, in order, after the earlier ones: `supabase/migrations/20261125002000_final_gaps.sql`. Then `npm install` (adds @sentry/nextjs and @playwright/test).

**Trust and product gaps**
- Landlords: Dashboard, Profile and hours. Set the days and hours you answer tenants. A reply-speed badge ("Replies within 1 hour") is worked out from your chats once you have had 3, and appears on your profile and listings.
- Landlords rate tenants after a confirmed rental (Dashboard, Incoming requests). Other landlords see the average and a short note on new requests; tenants never see it.
- County, sub-county and ward pages for search engines already existed from Step 7.

**Privacy and security (Step 14)**
- Seven full legal documents (Terms, Privacy, Cookies, Community and Listing Standards, Review Policy, Acceptable Use and Chat Conduct, Disclaimer) at /legal, written from what the product really does, with contents lists and version/effective date. Wording lives in `lib/legal.ts`. Sign-up (email and phone) now needs the "I am 18 or older and agree" box; Google sign-in shows the same notice.
- Account, Privacy and security: download all your data as a JSON file, delete your account for good (files first, then the account), and set up two-step sign-in.
- Staff two-step sign-in: each person sets it up at Account, Privacy and security. When everyone has, turn on `require_staff_mfa` in Admin, Settings. Do not turn it on before you have set up your own, or you will be asked for a code you do not have.
- Admin, Reviews: remove a review only with written proof; it goes into the audit log.
- `docs/legal/`: DPIA, ODPC registration checklist, retention schedule, data subject request procedure, incident response plan, security measures. Your advocate has reviewed the plan to build these; fill the DPIA sign-off, the operator details and the ODPC number when you have them.

**Quality and launch (Steps 15 and 16)**
- Unit tests (`npm test`) for search, saved searches, agreement, checklist, availability, phone, counties, universities, map data and legal content. Playwright smoke tests (`npm run e2e:install` once, then `BASE_URL=<your site> npm run e2e`) check home, search, sign-in, sign-up consent, all legal pages, information pages, a county page, 404, sitemap, route protection and the theme switch on desktop and phone. CI runs them when you add a repository variable `PREVIEW_URL`.
- Error pages (404, error and last-resort) and Sentry monitoring: add `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` to turn it on.
- `docs/GO-LIVE-CHECKLIST.md`, `docs/RESTORE-TEST.md`, `docs/ACCESSIBILITY-CHECKLIST.md`.

**Not built, by design (Step 17, after launch)**
Featured and boosted listings, subscriptions, M-Pesa fees, SMS notifications, store apps and Kiswahili. The flags `enable_paid_features` and `enable_sms_notifications` are ready; the legal documents already say fees would be introduced with notice.
