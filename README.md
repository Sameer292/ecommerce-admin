# Ecommerce Admin

A standalone admin workspace for one storefront per deployment. TanStack Start serves the UI, staff authentication, typed server functions, and the storefront integration API. Drizzle manages PostgreSQL in the private `commerce_admin` schema. The workspace uses shadcn/ui and Tailwind with a persisted light or dark theme.

## Run locally

1. Install dependencies with `bun install`. Use Node.js 22.12 or newer for Vite and the production server.
2. Copy `.env.example` to `.env`. Generate a unique `BETTER_AUTH_SECRET` with `openssl rand -hex 32` and set `ADMIN_EMAIL` and `ADMIN_PASSWORD` for the first superuser.
3. Start the local database with `docker compose up -d --wait`, or set `DATABASE_URL` to a PostgreSQL connection you control.
4. Run `bun run db:migrate` and `bun run admin:create`.
5. Optionally run `bun run db:seed` for sample catalog, inventory, customers, and orders. The seed preserves existing records when rerun. Use it with a development database.
6. Run `bun run dev` and open http://localhost:3000. If using a different port, pass `--port` and set `BETTER_AUTH_URL` to the same origin.

## Staff access

| Role | Access |
| --- | --- |
| Superuser | Manage commerce data, store preferences, and staff accounts |
| Manager | Manage products, categories, stock, order fulfillment, and customers |
| Viewer | Read the dashboard, commerce data, and store preferences |

Staff can change their own password. Superusers can create accounts and manage manager and viewer access. Disabling an account revokes its sessions. Public registration is closed. Share an initial password through a secure channel. The workspace preserves order and stock history when a referenced product or customer is retired.

## Per-client settings and deployment

- Use a separate deployment and database for each client. Set `DATABASE_URL`, `BETTER_AUTH_URL`, and a unique `BETTER_AUTH_SECRET` per deployment. Set `STORE_NAME` and `STORE_TIME_ZONE` as initial defaults. Superusers can override the name, reporting time zone, and contact email from Settings.
- Set `STORE_CURRENCY` before loading records. Monetary values are integer minor units in this currency, such as cents for USD. Converting an existing store requires a data migration.
- For Supabase, use its PostgreSQL connection string as `DATABASE_URL`. Set `DATABASE_MIGRATION_URL` to a direct or session-pooled connection if the runtime uses the transaction pooler. Keep the `commerce_admin` schema off the exposed schemas list in the Supabase Data API.
- Build with `bun run build` and serve with `bun run start`. The runtime accepts `PORT` and `HOST`. Use an HTTPS `BETTER_AUTH_URL` in production. Set `AUTH_CLIENT_IP_HEADER` only when your trusted proxy overwrites that header and prevents direct access to the origin. Without it, sign-in uses a shared rate-limit bucket.
- Keep server credentials outside client bundles. Remove the bootstrap password from your deployment environment after creating the first superuser.

## Storefront integration

The optional API is disabled until you set `STORE_INTEGRATION_TOKEN` to a separate random token of at least 32 characters. Send it as `Authorization: Bearer <token>` from your storefront backend. Keep it out of storefront browser code.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/store/catalog` | Lists active products with current stock, prices, and categories. Accepts `page`, `q`, and a `category` UUID. |
| `POST /api/store/orders` | Imports an order snapshot, creates or links its customer by email, and returns the order ID. An identical retry returns the existing ID. A different payload for the same order number returns HTTP 409. |
| `PATCH /api/store/orders` | Records a payment transition. Send the order `number`, `status` of `paid` or `refunded`, and `paidAt` when marking paid. Record the payment or refund with your provider first. |

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

The dashboard counts paid order totals by payment date, excludes refunded orders from sales, and counts order placements by creation date. Reporting uses the configured store time zone.

## Checks

Run `bun run check`, `bun run typecheck`, `bun test`, and `bun run build`. Generate new SQL migrations with `bun run db:generate` after editing the Drizzle schema.
