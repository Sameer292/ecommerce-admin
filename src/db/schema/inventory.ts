import { sql } from "drizzle-orm";
import { check, index, integer, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { products } from "./catalog";
import { commerce } from "./namespace";

export const stockAdjustments = commerce.table(
	"stock_adjustments",
	{
		id: uuid().primaryKey(),
		productId: uuid("product_id")
			.notNull()
			.references(() => products.id, { onDelete: "restrict" }),
		staffId: text("staff_id").references(() => user.id, {
			onDelete: "set null",
		}),
		delta: integer().notNull(),
		reason: text().notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index().on(table.productId, table.createdAt, table.id),
		check("stock_adjustments_nonzero", sql`${table.delta} <> 0`),
	],
);
