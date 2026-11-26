import { sql } from "drizzle-orm";
import { index, integer, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { commerce } from "./namespace";

export const syncOperation = commerce.enum("sync_operation", ["import", "payment"]);

export const orderSync = commerce.table(
	"order_sync",
	{
		orderNumber: text("order_number").notNull(),
		operation: syncOperation().notNull(),
		status: integer().notNull(),
		attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.orderNumber, table.operation] }),
		index().on(table.attemptedAt).where(sql`${table.status} >= 400`),
	],
);
