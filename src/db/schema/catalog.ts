import { sql } from "drizzle-orm";
import { check, index, integer, text, timestamp, uuid } from "drizzle-orm/pg-core";
import {
	categoryIcons,
	defaultCategoryIcon,
	productStatuses,
} from "../../features/catalog/catalog-options";
import { commerce } from "./namespace";

export const productStatus = commerce.enum("product_status", productStatuses);
export const categoryIcon = commerce.enum("category_icon", categoryIcons);

export const categories = commerce.table(
	"categories",
	{
		id: uuid().defaultRandom().primaryKey(),
		name: text().notNull(),
		slug: text().notNull().unique(),
		description: text().notNull().default(""),
		icon: categoryIcon().notNull().default(defaultCategoryIcon),
		version: integer().notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [index().on(table.name, table.id)],
);

export const products = commerce.table(
	"products",
	{
		id: uuid().defaultRandom().primaryKey(),
		name: text().notNull(),
		slug: text().notNull().unique(),
		sku: text().notNull().unique(),
		description: text().notNull().default(""),
		imageUrl: text("image_url").notNull().default(""),
		categoryId: uuid("category_id").references(() => categories.id, {
			onDelete: "restrict",
		}),
		status: productStatus().notNull().default("draft"),
		publishedAt: timestamp("published_at", { withTimezone: true }),
		priceMinor: integer("price_minor").notNull(),
		stock: integer().notNull().default(0),
		reservedStock: integer("reserved_stock").notNull().default(0),
		incomingStock: integer("incoming_stock").notNull().default(0),
		damagedStock: integer("damaged_stock").notNull().default(0),
		lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
		version: integer().notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("products_name_id_index").on(sql`lower(${table.name})`, table.id),
		index("products_category_id_name_id_index").on(
			table.categoryId,
			sql`lower(${table.name})`,
			table.id,
		),
		index("products_status_name_id_index").on(table.status, sql`lower(${table.name})`, table.id),
		index("products_available_low_stock")
			.on(sql`(${table.stock} - ${table.reservedStock} - ${table.damagedStock})`, table.id)
			.where(
				sql`${table.stock} - ${table.reservedStock} - ${table.damagedStock} <= ${table.lowStockThreshold} AND ${table.status} = 'active'`,
			),
		check(
			"products_nonnegative_values",
			sql`${table.priceMinor} >= 0 AND ${table.stock} >= 0 AND ${table.lowStockThreshold} >= 0`,
		),
		check(
			"products_stock_levels",
			sql`${table.reservedStock} >= 0 AND ${table.incomingStock} >= 0 AND ${table.damagedStock} >= 0 AND ${table.reservedStock}::bigint + ${table.damagedStock} <= ${table.stock}`,
		),
	],
);

export const availableStock =
	sql<number>`${products.stock} - ${products.reservedStock} - ${products.damagedStock}`.mapWith(
		Number,
	);

export const productSlugs = commerce.table(
	"product_slugs",
	{
		slug: text().primaryKey(),
		productId: uuid("product_id")
			.notNull()
			.references(() => products.id, { onDelete: "cascade" }),
	},
	(table) => [index().on(table.productId)],
);
