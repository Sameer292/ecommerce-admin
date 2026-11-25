# Ecommerce Admin

A standalone admin workspace for one storefront per deployment. TanStack Start serves the UI, typed server functions, and the storefront integration API. Supabase provides Auth and PostgreSQL. Drizzle manages the private `commerce_admin` schema. The workspace uses shadcn/ui and Tailwind with a persisted light or dark theme.

The workspace covers catalog, order fulfillment, inventory, customers, and staff access. Fix correctness, accessibility, and the existing staff workflows first. Scope multiwarehouse operations, bespoke permissions, merchandising rules, and profitability reporting against a store's actual workflow and data requirements before adding them.

## Run locally

1. Install dependencies with `bun install`. Use Node.js 22.12 or newer and a running Docker engine.
2. Create a loopback-only Docker network with `docker network create -o com.docker.network.bridge.host_binding_ipv4=127.0.0.1 ecommerce-admin-supabase-local`. Run `npx supabase start --network-id ecommerce-admin-supabase-local` to start the local project. [Supabase CLI setup](https://supabase.com/docs/guides/local-development)
3. Copy `.env.example` to `.env`. Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and `DATABASE_URL` from `npx supabase status`. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optionally `ADMIN_NAME` for the first superuser.
4. Run `bun run db:migrate`, `bun run db:lock-currency`, and `bun run admin:create`. Remove the bootstrap password from `.env` after creating the account.
5. Optionally run `bun run db:seed` for sample products, categories, customers, and orders. The seed preserves existing records when rerun.
6. Run `bun run dev` and open http://localhost:3000.

## Staff access

| Role | Access |
| --- | --- |
| Superuser | Manage commerce data, store preferences, and staff accounts |
| Manager | Manage products, categories, stock, order fulfillment, and customers |
| Viewer | Read the dashboard, commerce data, and store preferences |

Staff sign in with email and password and can change their own password. Superusers can create accounts and manage staff access from Team. They can disable or demote a superuser as long as at least one active, linked superuser remains. The app checks staff access on each protected request, so disabling an account blocks its dashboard access immediately. A Supabase user needs a linked staff record to enter the dashboard. Share initial passwords through a secure channel.

## Per-client settings and deployment

- Use a separate Supabase project and app deployment for each client. Copy the project URL and publishable and secret keys into the matching `SUPABASE_*` variables. Keep the secret key and PostgreSQL URL in the server environment. [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- Copy the PostgreSQL URL from the same project's **Connect** dialog. On an IPv4-only network, choose **Session pooler** on port 5432. Its username includes the project reference, such as `postgres.<project-ref>`. Enable TLS with `sslmode=require` or use `sslmode=verify-full` with Supabase's CA certificate. [Supabase PostgreSQL connections](https://supabase.com/docs/guides/database/connecting-to-postgres)
- `bun run db:migrate` uses `DATABASE_MIGRATION_URL` when set and falls back to `DATABASE_URL`. If the runtime uses the transaction pooler, give migrations a direct or session pooler URL.
- Order and customer substring search uses `pg_trgm` GIN indexes, installed by the migrations. Very short or broad search terms can still require scans.
- Enable email/password sign-in. For an admin-only Supabase project, turn off account signups in Authentication settings. Keep `commerce_admin` and `commerce_admin_legacy_auth` outside the exposed schemas in the Supabase Data API.
- Set `STORE_CURRENCY` explicitly and lock it before serving the application. For an existing store, confirm the currency used for its stored prices and orders, then run `bun run db:lock-currency` with that currency on the target database. The lock leaves amounts intact and rejects attempts to overwrite the currency. The application and storefront API read the locked currency from PostgreSQL. Superusers can update the name, reporting time zone, and contact email from Settings.
- Run `bun run db:migrate`, `bun run db:lock-currency`, and `bun run admin:create`. Build with `bun run build` and serve with `bun run start` behind HTTPS. The runtime accepts `PORT` and `HOST`.
- Production builds generate gzip and Brotli static assets. HTML uses streaming gzip when the client accepts it.

### Moving an existing deployment

Use the [backup and restore runbook](docs/backup-restore.md) before moving a database. For a commerce-only migration, restore the `commerce_admin` and `drizzle` schemas in the destination Supabase PostgreSQL database before running `bun run db:migrate`. The migration preserves catalog, orders, stock history, and staff profiles. It archives the old authentication tables in a private schema.

Provision the first superuser with the same email and a new password. Then provision the other staff accounts from Team using their existing email and role with a new password. This links the existing profile and preserves its audit history. Earlier passwords and sessions need to be replaced with Supabase credentials.

## Storefront integration

The optional API is disabled until you set `STORE_INTEGRATION_TOKEN` to a separate random token of at least 32 characters. Send it as `Authorization: Bearer <token>` from your storefront backend. Keep it out of storefront browser code.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/store/catalog` | Lists active products with current stock, prices, and categories. Accepts `page`, `q`, and a `category` UUID. |
| `GET /api/store/orders?number=WEB-1042` | Returns order and payment status, the first tracking number, an ISO update timestamp, and packages with carrier, service, tracking, and dispatch time. Returns 404 until the order is imported. |
| `POST /api/store/orders` | Imports an order snapshot, creates or links its customer by email, and returns the order ID. An identical retry returns the existing ID. A different payload for the same order number returns HTTP 409. |
| `PATCH /api/store/orders` | Records a payment event for the order `number`. Send `paid` with `paidAt`, `refunded` with optional `refundedAt`, or `failed` with `failedAt`, `externalId`, and `amountMinor`. |

Example order import body

```json
{
  "number": "WEB-1042",
  "currency": "USD",
  "createdAt": "2026-10-01T16:30:00Z",
  "customer": { "name": "Taylor Lee", "email": "taylor@example.test" },
  "items": [{ "sku": "NOTEBOOK-01", "name": "Notebook", "quantity": 2, "unitPriceMinor": 1800 }],
  "shippingMinor": 500,
  "shippingName": "Taylor Lee",
  "shippingAddress": "100 Sample Street\nPortland, OR 97205"
}
```

Import accepts an optional `paidAt` for already-paid orders. Other optional amounts are `taxMinor` and `discountMinor`. The storefront owns checkout, payment processing, and stock reservation. Recording an order or refund only updates its administrative records. The inventory screen records stock adjustments with a reason, actor, and timestamp.

Fetch fulfillment status from the storefront backend when showing an order to its buyer. The storefront authenticates the buyer and checks ownership before looking up the order number. The admin endpoint uses the integration token and returns operational status without buyer details.

Record events after the corresponding provider action. Send `source`, `method`, and a stable provider `externalId` for reconciliation. Identical retries are accepted and conflicting details return 409. Older full refunds appear in payment history with an unknown refund date.

Prepaid orders need recorded payment before dispatch. Import cash-on-delivery orders with `cashOnDelivery: true` or set Payment collection before dispatch while the order is unpaid. Fully refunded orders can be cancelled or recorded as delivered if already in transit.

Managers can correct the recipient or shipping address while an order is pending or processing. Enter a reason. Fulfillment activity records the staff member, changed fields, and reason.

Record each package from the Shipments section while an order is processing. Enter the carrier and the units included. Once all lines are dispatched, the order moves to Shipped. The original tracking field remains available for earlier orders.

The dashboard counts paid order totals by payment date, excludes refunded orders from sales, and counts order placements by creation date. Reporting uses the configured store time zone.

## Checks

Run `bun run check`, `bun run typecheck`, `bun test`, and `bun run build`. Generate new SQL migrations with `bun run db:generate` after editing the Drizzle schema.

Run `TEST_DATABASE=1 bun test tests/database.test.ts` with the configured database to check concurrent queries, the 15-second query timeout, and recovery after cancellation. This check only runs reads and takes about 15 seconds. The shared client also limits connection and pool queue waits to 10 seconds and disables query pipelining for compatibility with older Supavisor transaction poolers.

Run `TEST_QUERY_DATABASE_URL=postgresql://... bun test tests/commerce-queries.test.ts` against an empty disposable database on local Supabase to profile search, sorting, deep pagination, category options, and customer spending. It applies the migrations and loads 100,000 orders, 10,000 customers, 25,000 products, and 1,000 categories. Discard the test database afterward.

Run `TEST_TEAM_DATABASE_URL=postgresql://... bun test tests/team-access.test.ts` against an empty disposable database on local Supabase to check staff revocation and last-superuser protection under concurrent edits. This test applies the migrations and writes staff fixtures.

Run `TEST_PAYMENT_DATABASE_URL=postgresql://... bun test tests/payment.test.ts` against an empty disposable local database to check that payment retries preserve the recorded timestamp and reject conflicting timestamps.

Run `TEST_EDIT_DATABASE_URL=postgresql://... bun test tests/edit-conflicts.test.ts` against an empty disposable local database to verify that competing saves cannot overwrite category, product, customer, settings, or staff edits.

Run `TEST_WORKFLOW_DATABASE_URL=postgresql://... bun test tests/database-workflows.test.ts` against an empty disposable database to check concurrent stock changes, order retries, write rollback, and payment transitions. A standalone PostgreSQL instance needs the cluster roles `anon` and `authenticated` for the Supabase permissions migration. CI runs this suite alongside the payment, edit-conflict, and staff-access suites, each with a fresh database.

For browser regression tests, seed a disposable local Supabase workspace with `bun run db:seed`. Create a superuser and a viewer for the fixtures, then set `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `E2E_VIEWER_EMAIL`, and `E2E_VIEWER_PASSWORD`. Start the local app, run `bunx playwright install chromium`, then run `bun run test:e2e`. Set `E2E_BASE_URL` if the local app uses a different port.

CI provisions a disposable Supabase workspace for the same browser suite. It runs WCAG A/AA checks in both themes with the category icon picker and product delete dialog open.

Point uptime monitoring at `GET /api/health`. It returns 200 when PostgreSQL accepts a query and 503 if the query fails. Match the `X-Request-Id` response header or error reference to server logs.
