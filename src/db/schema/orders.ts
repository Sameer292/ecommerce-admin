import { sql } from "drizzle-orm";
import { check, index, integer, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { orderStatuses, paymentStatuses } from "../../features/orders/order-options";
import { user } from "./auth";
import { products } from "./catalog";
import { customers } from "./customers";
import { commerce } from "./namespace";

export const orderStatus = commerce.enum("order_status", orderStatuses);
export const paymentStatus = commerce.enum("payment_status", paymentStatuses);

export const orders = commerce.table(
	"orders",
	{
		id: uuid().defaultRandom().primaryKey(),
		number: text().notNull().unique(),
		importDigest: text("import_digest"),
		customerId: uuid("customer_id")
			.notNull()
			.references(() => customers.id, { onDelete: "restrict" }),
		status: orderStatus().notNull().default("pending"),
		paymentStatus: paymentStatus("payment_status").notNull().default("pending"),
		paidAt: timestamp("paid_at", { withTimezone: true }),
		subtotalMinor: integer("subtotal_minor").notNull(),
		shippingMinor: integer("shipping_minor").notNull().default(0),
		taxMinor: integer("tax_minor").notNull().default(0),
		discountMinor: integer("discount_minor").notNull().default(0),
		totalMinor: integer("total_minor").notNull(),
		shippingName: text("shipping_name").notNull().default(""),
		shippingAddress: text("shipping_address").notNull().default(""),
		trackingNumber: text("tracking_number").notNull().default(""),
		notes: text().notNull().default(""),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index().on(table.createdAt, table.id),
		index().on(table.status, table.createdAt, table.id),
		index().on(table.customerId, table.createdAt, table.id),
		index().on(table.paidAt).where(sql`${table.paymentStatus} = 'paid'`),
		check(
			"orders_money_nonnegative",
			sql`${table.subtotalMinor} >= 0 AND ${table.shippingMinor} >= 0 AND ${table.taxMinor} >= 0 AND ${table.discountMinor} >= 0 AND ${table.totalMinor} >= 0`,
		),
		check(
			"orders_total_matches_components",
			sql`${table.totalMinor} = ${table.subtotalMinor}::bigint + ${table.shippingMinor} + ${table.taxMinor} - ${table.discountMinor}`,
		),
		check(
			"orders_paid_timestamp_present",
			sql`${table.paymentStatus} = 'pending' OR ${table.paidAt} IS NOT NULL`,
		),
	],
);

export const orderItems = commerce.table(
	"order_items",
	{
		id: uuid().defaultRandom().primaryKey(),
		orderId: uuid("order_id")
			.notNull()
			.references(() => orders.id, { onDelete: "cascade" }),
		productId: uuid("product_id").references(() => products.id, { onDelete: "restrict" }),
		name: text().notNull(),
		sku: text().notNull(),
		quantity: integer().notNull(),
		unitPriceMinor: integer("unit_price_minor").notNull(),
	},
	(table) => [
		index().on(table.orderId, table.id),
		index().on(table.productId),
		check(
			"order_items_nonnegative_values",
			sql`${table.quantity} > 0 AND ${table.unitPriceMinor} >= 0 AND ${table.quantity}::bigint * ${table.unitPriceMinor} <= 2147483647`,
		),
	],
);

export const orderEvents = commerce.table(
	"order_events",
	{
		id: uuid().defaultRandom().primaryKey(),
		orderId: uuid("order_id")
			.notNull()
			.references(() => orders.id, { onDelete: "cascade" }),
		staffId: text("staff_id").references(() => user.id, { onDelete: "set null" }),
		previousStatus: orderStatus("previous_status").notNull(),
		status: orderStatus().notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [index().on(table.orderId, table.createdAt, table.id)],
);
