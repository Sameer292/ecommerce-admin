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

Staff sign in with email and password and can change their own password. Superusers can create accounts and manage staff access from Team. They can disable or demote a superuser as long as at least one active, linked superuser remains. The app checks staff access on each protected request, so disabling an account blocks its dashboard access immediately. A Supabase user needs a linked staff record to enter the dashboard. Share initial passwords through a secure channel. Superusers can search Audit history for catalog, order, payment, and staff changes. Audit entries capture field names and attribution without storing note, address, or credential values.

## Per-client settings and deployment

- Use a separate Supabase project and app deployment for each client. Copy the project URL and publishable and secret keys into the matching `SUPABASE_*` variables. Keep the secret key and PostgreSQL URL in the server environment. [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- Copy the PostgreSQL URL from the same project's **Connect** dialog. On an IPv4-only network, choose **Session pooler** on port 5432. Its username includes the project reference, such as `postgres.<project-ref>`. Enable TLS with `sslmode=require` or use `sslmode=verify-full` with Supabase's CA certificate. [Supabase PostgreSQL connections](https://supabase.com/docs/guides/database/connecting-to-postgres)
- `bun run db:migrate` uses `DATABASE_MIGRATION_URL` when set and falls back to `DATABASE_URL`. If the runtime uses the transaction pooler, give migrations a direct or session pooler URL.
- Order and customer substring search uses `pg_trgm` GIN indexes, installed by the migrations. Very short or broad search terms can still require scans.
- Enable email/password sign-in. For an admin-only Supabase project, turn off account signups in Authentication settings. Keep `commerce_admin` and `commerce_admin_legacy_auth` outside the exposed schemas in the Supabase Data API.
- Enable authenticator app MFA in Supabase Auth before deploying. Superusers enroll an authenticator on their first sign-in and verify it on each fresh session before they can open the console.
- Set the Supabase Auth Site URL to the admin application's public URL. Install the [invite](supabase/templates/staff-invite.html) and [recovery](supabase/templates/staff-recovery.html) email templates and configure SMTP for staff mail. The links open a confirmation page before they are redeemed. Staff can request a replacement from the sign-in page.
- Team invitations remain pending until the recipient sets their own password through a verified email link.
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
| `GET /api/store/catalog` | Lists active products, prices, and categories. `stock` is physical on hand. `availableStock` is sellable inventory once the admin inventory authority is enabled. Accepts `page`, `q`, and a `category` UUID. |
| `POST /api/store/inventory` | Atomically reserves, releases, or fulfills stock for one checkout or order and up to 25 SKUs. |
| `GET /api/store/inventory/alerts` | Pages through unacknowledged replenishment alerts for a server-side notification monitor. |
| `GET /api/store/orders?number=WEB-1042` | Returns order and payment status, the first tracking number, an ISO update timestamp, and packages with carrier, service, tracking, and dispatch time. Returns 404 until the order is imported. |
| `POST /api/store/orders` | Imports an order snapshot, creates or links its customer by email, and returns the order ID. An identical retry returns the existing ID. A different payload for the same order number returns HTTP 409. |
| `PATCH /api/store/orders` | Records a payment event for the order `number`. Send `paid` with `paidAt`, `refunded` with optional `refundedAt`, or `failed` with `failedAt`, `externalId`, and `amountMinor`. |
| `POST /api/store/notifications` | Claims one queued shipping, cancellation, or refund notification for up to five minutes. HTTP 204 means there is no work. |
| `PATCH /api/store/notifications` | Accepts `{ "id": "…", "claimId": "…", "status": "sent" }` or `"failed"`. Returns 204 for an accepted acknowledgement and 409 for a stale claim. |

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

Import accepts an optional `paidAt` for already-paid orders. Other optional amounts are `taxMinor` and `discountMinor`. The storefront owns checkout and payment processing. The admin database owns on-hand, incoming, damaged, and reserved balances. Staff can record receipts, damage, corrections, incoming quantities, and stocktakes. Ledger entries include balances before and after, the reason, actor, and any business reference.

Send inventory events from the storefront backend with a stable UUID `id`, the checkout or order `number`, an `operation` of `reserve`, `release`, or `fulfill`, and `lines` with `{ "sku": "NOTEBOOK-01", "quantity": 2 }`. Reserve before confirming checkout. Release on expiry, payment abandonment, or cancellation and fulfill reserved units at dispatch. A fulfillment removes the shipped units from both on-hand and reserved balances. Use the same `number` for that checkout throughout and one event ID per distinct action. Identical retries return 200. Insufficient stock, a conflicting event ID, or releasing another checkout's units returns 409 and applies no lines. A payment import or refund alone does not move units. Staff can put sellable returns back on hand when receiving them.

Before setting `STORE_INVENTORY_AUTHORITY=admin`, reconcile on-hand counts, seed any outstanding reservations through the inventory endpoint, and switch the checkout to reserve through this API. During cutover, `inventoryAuthority` is `unverified` and the catalog returns `availableStock: null`. Use a successful reservation, rather than a catalog read, to confirm availability at checkout.

Inventory opens one replenishment alert when an active product reaches its threshold. It resolves the alert if availability recovers or the product becomes inactive. A later drop opens a fresh alert. Managers can acknowledge alerts and review incoming stock from Inventory → Replenishment alerts. To notify staff outside the console, poll `GET /api/store/inventory/alerts?page=1` from the store's scheduled monitor. Page through the results, send each alert ID to the chosen channel once, and persist sent IDs across monitor restarts.

Fetch fulfillment status from the storefront backend when showing an order to its buyer. The storefront authenticates the buyer and checks ownership before looking up the order number. The admin endpoint uses the integration token and returns operational status without buyer details.

Send a stable `customer.externalId` for a known storefront account. The first import can link it to an existing email. Later orders follow that ID even when the buyer uses different contact details. Each order keeps its buyer snapshot. Staff can update the current profile or merge a duplicate into the confirmed profile to keep. A new storefront identity attempting to claim an email linked to a different identity returns 409 for reconciliation.

Managers can export a customer and their order records or anonymize a consolidated profile after its orders and returns are resolved. Anonymization clears contact data and tracking details, removes storefront identity links, and suppresses queued messages in the admin queue. Order quantities, amounts, payment history, and anonymization attribution remain. Any copies held by the storefront, carriers, and messaging provider are managed there.

Record events after the corresponding provider action. Send `source`, `method`, and a stable provider `externalId` for reconciliation. Identical retries are accepted and conflicting details return 409. Older full refunds appear in payment history with an unknown refund date.

Prepaid orders need recorded payment before dispatch. Import cash-on-delivery orders with `cashOnDelivery: true` or set Payment collection before dispatch while the order is unpaid. Fully refunded orders can be cancelled or recorded as delivered if already in transit.

Managers can correct the recipient or shipping address while an order is pending or processing. Enter a reason. Fulfillment activity records the staff member, changed fields, and reason.

Record each package from the Shipments section while an order is processing. Enter the carrier and the units included. Once all lines are dispatched, the order moves to Shipped. The original tracking field remains available for earlier orders. Select up to 25 records in Orders to print packing slips or invoices in one batch, or move eligible pending orders to Processing.

A return moves from requested to approved and received. Staff can restock sellable units when receiving the return. Record the provider refund through the payment endpoint. Send the amount in `amountMinor` and a stable `externalId` for partial refunds. For a return refund, also send its `returnId`. An omitted refund amount records the remaining paid balance. The response includes `paymentStatus`, which remains paid until the entire balance is refunded.

The storefront owns sending customer messages. Its background worker should poll the notification endpoint, look up the buyer by the returned order `number`, and use the job `id` as a durable idempotency key when sending. The job carries `kind`, `payload`, `claimId`, and `leaseUntil`. Acknowledge delivery before the lease expires. An expired claim becomes eligible for another worker, so keep the same send key across attempts even if acknowledgement is interrupted. Route shipping, cancellation, and refund messages for these events through this worker once enabled to avoid duplicate messages. Managers can see delivery status and retry failed jobs from the order page. The queue starts with new events after deployment.

The dashboard retains paid sales in their original payment period. Refunds are reported on their own event dates and deducted from net in those periods. Older refunds with no known date remain in payment history and are excluded from dated reports. Order placements are counted by creation date in the configured store time zone. Staff can select up to 366 calendar days and export daily totals for the selected and preceding periods in minor units.

The Overview work queue links to order filters and unresolved synchronization failures. Synchronization tracks the latest validated storefront order import and payment update per order number. It shows the HTTP status without the request body. Retrying successfully clears the failure. Requests rejected before validation and outages that stop PostgreSQL writes are visible through their HTTP responses and operational logs.

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
