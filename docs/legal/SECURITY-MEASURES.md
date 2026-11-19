# Security measures (summary for ODPC registration and DPIA)

- **Access control in the database:** row-level security on every table, tested in CI for visitor, tenant, landlord, agent, moderator and super admin.
- **Staff:** permission-based roles; super admin only edits staff and settings; two-step sign-in (authenticator app), enforceable with the `require_staff_mfa` setting; audit log of every staff action; reported chats opened only through a report.
- **Files:** identity documents and chat attachments in private buckets with short-lived signed links; listing and review photos public by design.
- **Transport and storage:** HTTPS everywhere; provider encryption at rest; secrets only in Vercel and Supabase settings; service role key never sent to the browser.
- **Application:** input validation with shared schemas; rate limiting on sign-in, messages, uploads and reports; security headers.
- **Monitoring:** error monitoring, provider logs, outbox and job monitoring in `Admin → Notifications`.
- **Resilience:** daily backups with point-in-time recovery on the production database; restore tested before launch (`docs/RESTORE-TEST.md`).
- **People:** staff briefed on confidentiality; access removed when roles end.
