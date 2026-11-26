import { and, eq, gt, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "@/db/client.server";
import { alphabetical, orderBySort } from "@/db/sort.server";
import { categories, products } from "@/db/schema/catalog";
import { stockAdjustments } from "@/db/schema/inventory";
import { orderItems } from "@/db/schema/orders";
import { parseMoneyInput } from "@/lib/money";
import { pageOffset, pageSize, searchPattern } from "@/lib/pagination";
import type { InventorySearch } from "@/features/inventory/inventory.types";
import { env } from "@/server/env.server";
import { ActionError } from "@/server/mutation.server";
import type { ProductSearch, ProductValues, StockFilter } from "./catalog.types";

export const lowStock = sql`${products.stock} <= ${products.lowStockThreshold}`;

const stockConditions = {
	in: gt(products.stock, products.lowStockThreshold),
	out: eq(products.stock, 0),
	low: and(gt(products.stock, 0), lowStock),
};

const productFilter = (
	{ q, status, category, minPriceMinor, maxPriceMinor }: Omit<ProductSearch, "sort">,
	stock?: StockFilter,
) => {
	const pattern = searchPattern(q);
	return and(
		q ? or(ilike(products.name, pattern), ilike(products.sku, pattern)) : undefined,
		status ? eq(products.status, status) : undefined,
		category ? eq(products.categoryId, category) : undefined,
		minPriceMinor === undefined ? undefined : gte(products.priceMinor, minPriceMinor),
		maxPriceMinor === undefined ? undefined : lte(products.priceMinor, maxPriceMinor),
		stock ? stockConditions[stock] : undefined,
	);
};

const productSortColumns = {
	name: alphabetical(products.name),
	category: alphabetical(sql`coalesce(${categories.name}, 'Uncategorized')`),
	price: products.priceMinor,
	date: products.createdAt,
	stock: products.stock,
	sku: alphabetical(products.sku),
	threshold: products.lowStockThreshold,
};

const columns = {
	id: products.id,
	createdAt: products.createdAt,
	name: products.name,
	sku: products.sku,
	imageUrl: products.imageUrl,
	status: products.status,
	priceMinor: products.priceMinor,
	stock: products.stock,
	lowStockThreshold: products.lowStockThreshold,
	categoryName: categories.name,
};

export const listProducts = async (
	search: Omit<ProductSearch, "sort"> & { sort?: ProductSearch["sort"] | InventorySearch["sort"] },
	stock?: StockFilter,
) => {
	const where = productFilter(search, stock);
	const [rows, total] = await Promise.all([
		db
			.select(columns)
			.from(products)
			.leftJoin(categories, eq(products.categoryId, categories.id))
			.where(where)
			.orderBy(...orderBySort(productSortColumns, search.sort ?? "name.asc", products.id))
			.limit(search.perPage ?? pageSize)
			.offset(pageOffset(search.page, search.perPage)),
		db.$count(products, where),
	]);
	return { rows, total };
};

export const findProduct = async (id: string) => {
	const [product] = await db.select().from(products).where(eq(products.id, id));
	return product;
};

export const productHasHistory = async (id: string) => {
	const [orders, stock] = await Promise.all([
		db.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.productId, id)).limit(1),
		db
			.select({ id: stockAdjustments.id })
			.from(stockAdjustments)
			.where(eq(stockAdjustments.productId, id))
			.limit(1),
	]);
	return orders.length > 0 || stock.length > 0;
};

export const saveProduct = async ({ id, price, version, ...values }: ProductValues) => {
	const priceMinor = parseMoneyInput(price, env.STORE_CURRENCY);
	if (priceMinor === null)
		throw new ActionError(`Enter a valid ${env.STORE_CURRENCY} price.`, "price");

	if (!id) return db.insert(products).values({ ...values, priceMinor });
	const [updated] = await db
		.update(products)
		.set({ ...values, priceMinor, updatedAt: new Date(), version: sql`${products.version} + 1` })
		.where(and(eq(products.id, id), eq(products.version, version ?? -1)))
		.returning({ id: products.id });
	if (!updated)
		throw new ActionError("This product changed or was removed. Refresh before saving.");
};

export const deleteProduct = (id: string) => db.delete(products).where(eq(products.id, id));
