# Go-live checklist

Tick each item, then sign at the bottom.

## Accounts and domain
- [ ] Domain bought and added to Vercel; HTTPS working
- [ ] `NEXT_PUBLIC_SITE_URL` set to the real address in Production
- [ ] Supabase **Site URL** and **Redirect URLs** (`<address>/auth/callback`) updated
- [ ] Google Cloud OAuth: authorised redirect URI (Supabase callback) and the Maps key restricted to the real address with `/*`
- [ ] Vercel on the **Pro** plan; Supabase production project on **Pro** (backups, no pausing)
- [ ] Production, Preview and local use separate Supabase projects

## Database
- [ ] All migrations in `supabase/migrations` applied in order on production
- [ ] pg_cron enabled; jobs present: `purge`, `expire-listings`, `expiry-reminders`, `saved-search-alerts`
- [ ] RLS test suite passes (`supabase test db`)
- [ ] Super admin created (README SQL line); two-step sign-in set up, then `require_staff_mfa` turned on
- [ ] Backups confirmed running; **restore tested** (`docs/RESTORE-TEST.md`)

## Messaging
- [ ] Resend domain verified; `RESEND_API_KEY` and `NOTIFY_FROM` set
- [ ] `CRON_SECRET` set; notification worker scheduled every 5 minutes (`/api/cron/notifications`)
- [ ] Phone sign-in: SMS hook tested with a real number
- [ ] WhatsApp template approved (optional); `WHATSAPP_*` set; flag `enable_whatsapp` on

## Quality
- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass
- [ ] `npm run e2e` smoke tests pass against the preview
- [ ] Accessibility checks done (`docs/ACCESSIBILITY-CHECKLIST.md`)
- [ ] Tested on a low-end Android phone on 3G/4G throttling; low-data behaviour fine
- [ ] Sentry DSN set and a test error received

## Legal
- [ ] Advocate sign-off on the seven documents and the agreement template filed
- [ ] ODPC registration done; number added to the Privacy Policy
- [ ] DPIA signed (`docs/legal/DPIA.md`)

## People and content
- [ ] Moderation queue owner named and trained; moderators added in `Admin → Staff`
- [ ] Reports and verification queues checked daily for the first month
- [ ] Landlords recruited in Nairobi, Kakamega, Kisumu and Nakuru; first listings published
- [ ] Social profiles and contact details correct in the footer

Signed (owner): ________________  Date: ____________
