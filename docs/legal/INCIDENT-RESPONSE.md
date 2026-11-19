# Personal data breach response

**Goal:** contain, assess, notify, learn. The Data Protection Act requires notifying the ODPC within **72 hours** of becoming aware of a breach likely to risk people’s rights, and telling affected people without delay where the risk is high.

1. **Detect**: alert from error monitoring, a provider notice, a user report, or unusual audit log entries.
2. **Contain** (first hour): rotate keys (Supabase service role, JWT secret, Resend, WhatsApp token, CRON_SECRET); disable the affected feature with a flag in `Admin → Settings`; revoke staff sessions; make storage buckets private if exposed.
3. **Assess**: what data, how many people, was it encrypted or public, how long, who may have accessed it. Check `admin_audit_log` and provider logs.
4. **Notify**: ODPC through its portal within 72 hours; affected people by email/in-app with what happened, what data, what to do, and a contact. Notify the advocate.
5. **Fix and verify**: patch, run the RLS test suite, review policies.
6. **Review**: write what happened, what worked, what changes. Update the DPIA.

Keep a breach register even for incidents that are not notified.
