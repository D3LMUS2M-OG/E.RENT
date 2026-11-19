# Backup restore test

Do once before launch, then every quarter.

1. In Supabase (production): **Database → Backups**. Confirm daily backups exist and point-in-time recovery is on.
2. Create a **new, empty** Supabase project named `erent-restore-test`.
3. Restore the latest backup into it (or use the CLI: `supabase db dump` from production, then `psql` into the test project).
4. Check: `select count(*) from listings;` `select count(*) from profiles;` `select count(*) from reviews;` match production within the backup time.
5. Check storage buckets exist; files are not part of a database backup, so confirm the bucket policies and a sample of files in production storage.
6. Run `supabase test db` against the test project.
7. Note the time it took and any problems below, then delete the test project.

| Date | Tester | Time taken | Result | Notes |
|---|---|---|---|---|
| | | | | |
