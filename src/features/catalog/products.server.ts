import { and, asc, eq, gt, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "@/db/client.server";
import { categories, products } from "@/db/schema/catalog";
import { parseMoneyInput } from "@/lib/money";
import { pageOffset, pageSize, searchPattern } from "@/lib/pagination";
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
	{ q, status, category, minPriceMinor, maxPriceMinor }: ProductSearch,
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

const columns = {
	id: products.id,
	name: products.name,
	sku: products.sku,
	imageUrl: products.imageUrl,
	status: products.status,
	priceMinor: products.priceMinor,
	stock: products.stock,
	lowStockThreshold: products.lowStockThreshold,
	categoryName: categories.name,
};

export const listProducts = async (search: ProductSearch, stock?: StockFilter) => {
	const where = productFilter(search, stock);
	const [rows, total] = await Promise.all([
		db
			.select(columns)
			.from(products)
			.leftJoin(categories, eq(products.categoryId, categories.id))
			.where(where)
			.orderBy(asc(products.name), asc(products.id))
			.limit(pageSize)
			.offset(pageOffset(search.page)),
		db.$count(products, where),
	]);
	return { rows, total };
};

export const findProduct = async (id: string) => {
	const [product] = await db.select().from(products).where(eq(products.id, id));
	return product;
};

export const saveProduct = async ({ id, price, ...values }: ProductValues) => {
	const priceMinor = parseMoneyInput(price, env.STORE_CURRENCY);
	if (priceMinor === null) throw new ActionError(`Enter a valid ${env.STORE_CURRENCY} price.`);

	if (!id) return db.insert(products).values({ ...values, priceMinor });
	const [updated] = await db
		.update(products)
		.set({ ...values, priceMinor, updatedAt: new Date() })
		.where(eq(products.id, id))
		.returning({ id: products.id });
	if (!updated) throw new ActionError("This product no longer exists.");
};

export const deleteProduct = (id: string) => db.delete(products).where(eq(products.id, id));
