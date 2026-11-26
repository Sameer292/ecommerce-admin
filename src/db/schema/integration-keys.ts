import { bigint, boolean, integer, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { integrationScopes } from "../../features/store-integration/integration-scopes";
import { user } from "./auth";
import { commerce } from "./namespace";

export const integrationScope = commerce.enum("integration_scope", integrationScopes);
export const integrationKeys = commerce.table("integration_keys", {
	id: uuid().defaultRandom().primaryKey(),
	name: text().notNull(),
	digest: text().notNull().unique(),
	scopes: integrationScope().array().notNull(),
	legacy: boolean().notNull().default(false),
	createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	revokedAt: timestamp("revoked_at", { withTimezone: true }),
	lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
	requestCount: bigint("request_count", { mode: "number" }).notNull().default(0),
	windowStart: timestamp("window_start", { withTimezone: true }),
	windowCount: integer("window_count").notNull().default(0),
});
