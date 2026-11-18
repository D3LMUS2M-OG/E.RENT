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
