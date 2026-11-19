# Retention schedule

| Data | Kept for | How it is removed |
|---|---|---|
| Chat messages and attachments | 30 days, or sooner if deleted | Nightly purge job (`/api/cron/purge-chat`); user delete |
| Reported-chat evidence | While the report and any follow-up need it | Reviewed by the super admin; deleted when no longer needed |
| Verification documents | While verified and needed to protect users | Deleted on account deletion or request (`Account → Privacy and security`) |
| Listings | Until removed or account deleted; hidden from search after 90 days unless renewed | Owner delete; account deletion |
| Reviews written by a user | Until the user deletes the account or staff remove it with proof | Account deletion; `Admin → Reviews` (audit-logged) |
| Tenant ratings by landlords | Until the landlord or tenant account is deleted | Account deletion |
| Notifications | Until the user deletes them or the account | Account deletion |
| Notification outbox | Sent and failed rows kept for troubleshooting; review quarterly and clear rows older than 90 days | Manual SQL `delete from notification_outbox where created_at < now() - interval '90 days'` |
| Listing view counts | Aggregated numbers, no personal data | Not personal; kept |
| Admin audit log | At least 12 months | Append-only; archived, not edited |
| Error monitoring (Sentry) | Provider default (90 days) | Provider setting |
| Provider backups | Provider cycle | Expire automatically |
