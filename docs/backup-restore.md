# Backup and restore

## Verify production coverage

Open **Database → Backups** in the Supabase project. Record the latest successful backup in UTC, its retention, and the earliest and latest recoverable timestamps if point-in-time recovery is enabled. Compare these with the store's acceptable data-loss and downtime limits. Where the project plan lacks the required coverage, schedule encrypted logical exports with off-site retention. Check the project’s [backup options](https://supabase.com/docs/guides/platform/backups).

Record the application commit and deployment settings alongside the backup. Keep database connection strings, Supabase keys, and integration credentials in the deployment secret manager. Keep a separate backup of Storage objects if the store uses Supabase Storage.

## Restore to an isolated project

1. Choose the last clean restore point. Use Supabase’s [restore to a new project](https://supabase.com/docs/guides/platform/clone-project) when available. This preserves the source and copies the Auth records referenced by staff profiles.
2. Configure the destination keys, Auth redirect URLs, settings, and any Storage object copy. Keep commerce schemas private and pause storefront writes to the restore target.
3. Point the matching application build at the destination and run `bun run db:migrate`. Confirm the locked currency matches the source.
4. Compare product, customer, order, line, stock history, and staff counts with the source snapshot. Verify staff-to-Auth links and check that `anon` and `authenticated` lack access to the private commerce schemas. Test staff sign-in, a catalog read, an order detail, and a recent stock adjustment. Confirm that `GET /api/health` returns 200.
5. Record the tested restore point, elapsed time, and discrepancies. Coordinate a write freeze and deployment cutover once the restored data is accepted.

## Logical commerce export

Use a direct PostgreSQL connection or session pooler URL and a PostgreSQL client at least as new as the source server. Use a secure local directory for the archive.

```bash
pg_dump --dbname="$BACKUP_SOURCE_URL" --format=custom \
  --schema=commerce_admin --schema=commerce_admin_legacy_auth --schema=drizzle \
  --file=commerce.dump
```

Restore into a dedicated PostgreSQL database with the matching `auth.users` records, the Supabase roles, and the `pg_trgm` extension already available. Use the full project recovery path above to preserve managed Auth. For a commerce-only migration in which staff identities will be re-provisioned, provision matching Auth IDs before loading any linked staff rows or re-link them through a separately validated migration.

```bash
pg_restore --dbname="$BACKUP_RESTORE_URL" --no-owner \
  --single-transaction --exit-on-error commerce.dump
```

A disposable PostgreSQL 17 drill on November 26, 2026 restored 32 products, 46 customers, 121 orders, 241 line items, two linked staff profiles, and all 11 migrations. Counts and the USD currency lock matched the source. The restored commerce schema denied usage to `anon`.
