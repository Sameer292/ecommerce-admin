import { sql } from "drizzle-orm";
import { check, index, integer, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { commerce } from "./namespace";

export const customers = commerce.table(
	"customers",
	{
		id: uuid().defaultRandom().primaryKey(),
		name: text().notNull(),
		email: text().notNull().unique(),
		phone: text().notNull().default(""),
		notes: text().notNull().default(""),
		version: integer().notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("customers_name_search_index").using("gin", table.name.op("gin_trgm_ops")),
		index("customers_email_search_index").using("gin", table.email.op("gin_trgm_ops")),
		index().on(table.name, table.id),
		index().on(table.createdAt),
		check("customers_email_normalized", sql`${table.email} = lower(trim(${table.email}))`),
	],
);
