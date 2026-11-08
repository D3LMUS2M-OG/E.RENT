# E.Rent

Kenya-wide rental marketplace. Next.js (App Router) on Vercel, Supabase for Postgres, Auth, Realtime and Storage. See the PRD, ARD and Build Plan.

## Built so far (Build Plan Steps 0 to 4, first pass)

| Step | What is in this repo |
| --- | --- |
| 0 Foundations | Next.js 16 + TypeScript, env template, CI workflow, security headers |
| 1 Design system | Three-layer tokens (`app/globals.css`), light and dark, motion tokens, logo SVGs, Button, Input, Skeleton, VerifiedBadge, Rating, ListingCard, `/design` library page |
| 3 Database | `supabase/migrations/…_foundation.sql`: geography, profiles, roles, organisations, delegations, flags, staff permissions, audit log, auth hook, RLS everywhere; 47-county seed; pgTAP tests |
| 4 App shell and auth | Header, footer, proxy session refresh, route guards, email and password sign-in and sign-up with Zod, flags reader, PWA manifest and service worker, offline page, robots, sitemap, county SEO pages |

Not built yet: listings, media, search SQL, rental flow, chat, reviews, panels, notifications, legal pages, onboarding, role switcher, wards and sub-counties seed (needs IEBC data).

## Run it

```bash
npm install
cp .env.example .env.local        # fill in Supabase URL and publishable key
supabase start && supabase db reset
npm run dev
npm run typecheck && npm test
supabase test db                  # RLS policy tests
```

Make yourself super admin after your first sign-up (SQL editor, service role):

```sql
insert into public.staff_roles (user_id, role) values ('<your auth user id>', 'super_admin');
```

## Notes

- `proxy.ts` replaces `middleware.ts` in Next.js 16.
- This scaffold was written without network access, so dependencies were never installed and the build has not been run. Expect small version or typing fixes on first `npm install && npm run typecheck`.
- `design/logo-wordmark.svg` uses live text. Convert to outlines before final brand export.
