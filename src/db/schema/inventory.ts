import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	jsonb,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { products } from "./catalog";
import { commerce } from "./namespace";

export type StockLevels = {
	stock: number;
	reservedStock: number;
	incomingStock: number;
	damagedStock: number;
};

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
		reference: text(),
		kind: text(),
		quantity: integer(),
		before: jsonb("before_levels").$type<StockLevels>(),
		after: jsonb("after_levels").$type<StockLevels>(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index().on(table.productId, table.createdAt, table.id),
		check(
			"stock_adjustments_nonzero_or_typed",
			sql`${table.delta} <> 0 OR ${table.kind} IS NOT NULL`,
		),
	],
);

export const stockReservations = commerce.table(
	"stock_reservations",
	{
		number: text().notNull(),
		productId: uuid("product_id")
			.notNull()
			.references(() => products.id, { onDelete: "restrict" }),
		quantity: integer().notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.number, table.productId] }),
		check("stock_reservations_positive_quantity", sql`${table.quantity} > 0`),
	],
);

export const stockMovements = commerce.table("stock_movements", {
	id: uuid().primaryKey(),
	digest: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const replenishmentAlerts = commerce.table(
	"replenishment_alerts",
	{
		id: uuid().defaultRandom().primaryKey(),
		productId: uuid("product_id")
			.notNull()
			.references(() => products.id, { onDelete: "cascade" }),
		openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
		acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
		acknowledgedBy: text("acknowledged_by").references(() => user.id, { onDelete: "set null" }),
		resolvedAt: timestamp("resolved_at", { withTimezone: true }),
	},
	(table) => [
		uniqueIndex("replenishment_alerts_open_product")
			.on(table.productId)
			.where(sql`${table.resolvedAt} IS NULL`),
		index().on(table.openedAt, table.id).where(sql`${table.resolvedAt} IS NULL`),
	],
);
