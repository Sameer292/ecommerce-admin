import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	text,
	timestamp,
	uuid,
	type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
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
		mergedInto: uuid("merged_into").references((): AnyPgColumn => customers.id, {
			onDelete: "restrict",
		}),
		mergedAt: timestamp("merged_at", { withTimezone: true }),
		mergedBy: text("merged_by").references(() => user.id, { onDelete: "set null" }),
		mergeReason: text("merge_reason"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("customers_name_search_index").using("gin", table.name.op("gin_trgm_ops")),
		index("customers_email_search_index").using("gin", table.email.op("gin_trgm_ops")),
		index("customers_phone_search_index").using(
			"gin",
			sql`(regexp_replace(${table.phone}, '[^0-9]', '', 'g')) gin_trgm_ops`,
		),
		index().on(table.name, table.id),
		index().on(table.createdAt),
		index().on(table.mergedInto),
		check("customers_email_normalized", sql`${table.email} = lower(trim(${table.email}))`),
		check("customers_distinct_merge_target", sql`${table.mergedInto} <> ${table.id}`),
	],
);

export const customerIdentities = commerce.table(
	"customer_identities",
	{
		externalId: text("external_id").primaryKey(),
		customerId: uuid("customer_id")
			.notNull()
			.references(() => customers.id, { onDelete: "restrict" }),
	},
	(table) => [index().on(table.customerId)],
);
