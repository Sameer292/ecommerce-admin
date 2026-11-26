import { sql } from "drizzle-orm";
import { check, integer, text } from "drizzle-orm/pg-core";
import { commerce } from "./namespace";

export const storeSettings = commerce.table(
	"store_settings",
	{
		id: integer().primaryKey().default(1),
		name: text().notNull(),
		contactEmail: text("contact_email").notNull().default(""),
		timeZone: text("time_zone").notNull(),
		version: integer().notNull().default(0),
	},
	(table) => [check("store_settings_singleton", sql`${table.id} = 1`)],
);
