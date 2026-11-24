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
		priceMinor: integer("price_minor").notNull(),
		stock: integer().notNull().default(0),
		lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index().on(table.name, table.id),
		index().on(table.categoryId, table.name, table.id),
		index().on(table.status, table.name, table.id),
		index("products_low_stock")
			.on(table.stock, table.id)
			.where(sql`${table.stock} <= ${table.lowStockThreshold} AND ${table.status} = 'active'`),
		check(
			"products_nonnegative_values",
			sql`${table.priceMinor} >= 0 AND ${table.stock} >= 0 AND ${table.lowStockThreshold} >= 0`,
		),
	],
);
