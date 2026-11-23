import { sql } from "drizzle-orm";
import { check, index, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { commerce } from "./namespace";

export const customers = commerce.table(
	"customers",
	{
		id: uuid().defaultRandom().primaryKey(),
		name: text().notNull(),
		email: text().notNull().unique(),
		phone: text().notNull().default(""),
		notes: text().notNull().default(""),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index().on(table.name, table.id),
		index().on(table.createdAt),
		check("customers_email_normalized", sql`${table.email} = lower(trim(${table.email}))`),
	],
);
