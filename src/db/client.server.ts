import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/server/env.server";

export const connection = postgres(env.DATABASE_URL, { prepare: false });
export const db = drizzle(connection);
