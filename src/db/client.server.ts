import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/server/env.server";

export const connection = postgres(env.DATABASE_URL, {
	prepare: false,
	// shortcut: older Supavisor stalls on pipelined queries; revisit after the pooler is upgraded.
	max_pipeline: 1,
	connect_timeout: 10,
	queue_timeout: 10,
	query_timeout: 15,
});
export const db = drizzle(connection);
