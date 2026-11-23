# Ecommerce Admin

A standalone admin workspace for one storefront per deployment. TanStack Start serves the UI, typed server functions, and staff authentication. Drizzle manages PostgreSQL in the private `commerce_admin` schema.

## Run locally

1. Install dependencies with `bun install`.
2. Copy `.env.example` to `.env`. Set `BETTER_AUTH_SECRET` using `openssl rand -hex 32`, and set `ADMIN_EMAIL` and `ADMIN_PASSWORD` for your first superuser.
3. Start the local database with `docker compose up -d --wait`, or set `DATABASE_URL` to a PostgreSQL connection you control.
4. Run `bun run db:migrate` and `bun run admin:create`.
5. Start the workspace with `bun run dev` and open http://localhost:3000.

If you change the port, update `BETTER_AUTH_URL` to match the browser origin. Keep the database URL and authentication secret on the server. Staff sign-up is closed.

## Checks

Run `bun run check`, `bun run typecheck`, `bun test`, and `bun run build`.
