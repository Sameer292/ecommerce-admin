# Ecommerce Admin

A standalone admin workspace for one storefront per deployment. TanStack Start serves the UI, typed server functions, and the storefront integration API. Supabase provides Auth and PostgreSQL. Drizzle manages the private `commerce_admin` schema. The workspace uses shadcn/ui and Tailwind with a persisted light or dark theme.

## Run locally

1. Install dependencies with `bun install`. Use Node.js 22.12 or newer and a running Docker engine.
2. Create a loopback-only Docker network with `docker network create -o com.docker.network.bridge.host_binding_ipv4=127.0.0.1 ecommerce-admin-supabase-local`. Run `npx supabase start --network-id ecommerce-admin-supabase-local` to start the local project. [Supabase CLI setup](https://supabase.com/docs/guides/local-development)
3. Copy `.env.example` to `.env`. Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and `DATABASE_URL` from `npx supabase status`. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optionally `ADMIN_NAME` for the first superuser.
4. Run `bun run db:migrate` and `bun run admin:create`. Remove the bootstrap password from `.env` after creating the account.
5. Optionally run `bun run db:seed` for sample products, categories, customers, and orders. The seed preserves existing records when rerun.
6. Run `bun run dev` and open http://localhost:3000.

## Staff access

| Role | Access |
| --- | --- |
| Superuser | Manage commerce data, store preferences, and staff accounts |
| Manager | Manage products, categories, stock, order fulfillment, and customers |
| Viewer | Read the dashboard, commerce data, and store preferences |

Staff sign in with email and password and can change their own password. Superusers can create accounts and manage manager and viewer access. The app checks staff access on each protected request, so disabling an account blocks its dashboard access immediately. A Supabase user needs a linked staff record to enter the dashboard. Share initial passwords through a secure channel.

## Per-client settings and deployment

- Use a separate Supabase project and app deployment for each client. Copy the project URL and publishable and secret keys into the matching `SUPABASE_*` variables. Keep the secret key and PostgreSQL URL in the server environment. [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- Copy the PostgreSQL URL from the same project's **Connect** dialog. On an IPv4-only network, choose **Session pooler** on port 5432. Its username includes the project reference, such as `postgres.<project-ref>`. Enable TLS with `sslmode=require` or use `sslmode=verify-full` with Supabase's CA certificate. [Supabase PostgreSQL connections](https://supabase.com/docs/guides/database/connecting-to-postgres)
- `bun run db:migrate` uses `DATABASE_MIGRATION_URL` when set and falls back to `DATABASE_URL`. If the runtime uses the transaction pooler, give migrations a direct or session pooler URL.
- Enable email/password sign-in. For an admin-only Supabase project, turn off account signups in Authentication settings. Keep `commerce_admin` and `commerce_admin_legacy_auth` outside the exposed schemas in the Supabase Data API.
- Set `STORE_NAME`, `STORE_TIME_ZONE`, and `STORE_CURRENCY` before loading records. Superusers can update the name, reporting time zone, and contact email from Settings. Amounts are stored as integer minor units of the configured currency.
- Run `bun run db:migrate` and `bun run admin:create`. Build with `bun run build` and serve with `bun run start` behind HTTPS. The runtime accepts `PORT` and `HOST`.

### Moving an existing deployment

Back up the old database. When moving databases, restore the `commerce_admin` and `drizzle` schemas in the destination Supabase PostgreSQL database before running `bun run db:migrate`. The migration preserves catalog, orders, stock history, and staff profiles. It archives the old authentication tables in a private schema.

Provision the first superuser with the same email and a new password. Then provision the other staff accounts from Team using their existing email and role with a new password. This links the existing profile and preserves its audit history. Earlier passwords and sessions need to be replaced with Supabase credentials.

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

Run `TEST_DATABASE=1 bun test tests/database.test.ts` with the configured database to check concurrent queries, the 15-second query timeout, and recovery after cancellation. This check only runs reads and takes about 15 seconds. The shared client also limits connection and pool queue waits to 10 seconds and disables query pipelining for compatibility with older Supavisor transaction poolers.
