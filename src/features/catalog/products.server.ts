import { and, eq, gt, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import type { output as ZOutput } from "zod";
import { inStaffAudit } from "@/db/audit-actor.server";
import { db } from "@/db/client.server";
import { alphabetical, orderBySort } from "@/db/sort.server";
import { availableStock, categories, products } from "@/db/schema/catalog";
import { stockAdjustments } from "@/db/schema/inventory";
import { orderItems } from "@/db/schema/orders";
import { parseMoneyInput } from "@/lib/money";
import { pageOffset, pageSize, searchPattern } from "@/lib/pagination";
import type { InventorySearch } from "@/features/inventory/inventory.types";
import { getStoreCurrency } from "@/features/settings/store-currency.server";
import { ActionError } from "@/server/mutation.server";
import type { Product, ProductSearch, ProductValues, StockFilter } from "./catalog.types";
import type { bulkProductSchema } from "./catalog-validation";
import { productImageUrl } from "./product-media.server";

export const lowStock = lte(availableStock, products.lowStockThreshold);

const stockConditions = {
	in: gt(availableStock, products.lowStockThreshold),
	out: eq(availableStock, 0),
	low: and(gt(availableStock, 0), lowStock),
	at_or_below: lowStock,
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
	stock: availableStock,
	sku: alphabetical(products.sku),
	threshold: products.lowStockThreshold,
};

const columns = {
	id: products.id,
	createdAt: products.createdAt,
	name: products.name,
	sku: products.sku,
	imageUrl: products.imageUrl,
	imageKey: products.imageKey,
	status: products.status,
	version: products.version,
	priceMinor: products.priceMinor,
	stock: products.stock,
	availableStock,
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
	return {
		rows: rows.map(({ imageKey, imageUrl, ...row }) => ({
			...row,
			imageUrl: productImageUrl(imageKey, imageUrl),
		})),
		total,
	};
};

export const findProduct = async (id: string) => {
	const [product] = await db.select().from(products).where(eq(products.id, id));
	return product;
};

export const listProductVariants = (id: string) =>
	db
		.select({
			id: products.id,
			name: products.name,
			sku: products.sku,
			priceMinor: products.priceMinor,
			status: products.status,
			variantOptions: products.variantOptions,
			availableStock,
		})
		.from(products)
		.where(eq(products.variantOf, id))
		.orderBy(products.name, products.id);

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

export const saveProduct = async (values: ProductValues, staffId?: string, imageKey?: string) => {
	const currency = await getStoreCurrency();
	const priceMinor = parseMoneyInput(values.price, currency);
	if (priceMinor === null) throw new ActionError(`Enter a valid ${currency} price.`, "price");
	return inStaffAudit(staffId, (transaction) =>
		persistProduct(transaction, values, priceMinor, imageKey),
	);
};

export const productVariantKey = (variantOptions: Product["variantOptions"] | undefined) =>
	variantOptions
		? JSON.stringify(
				variantOptions
					.map(({ name, value }) => [
						name.normalize("NFKC").toLowerCase(),
						value.normalize("NFKC").toLowerCase(),
					])
					.sort(([left], [right]) => (left < right ? -1 : left === right ? 0 : 1)),
			)
		: undefined;

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const persistProduct = async (
	transaction: Transaction,
	{ id, price: _price, version, variantOf, variantOptions, ...values }: ProductValues,
	priceMinor: number,
	imageKey?: string,
) => {
	const variantKey = productVariantKey(variantOptions);
	const variant = { variantOf, variantOptions, variantKey };
	if (!id) {
		if (variantOf) {
			const [parent] = await transaction
				.select({ variantOf: products.variantOf })
				.from(products)
				.where(eq(products.id, variantOf))
				.for("update");
			if (!parent || parent.variantOf)
				throw new ActionError("Choose a parent product to add this variant.");
			if ((await transaction.$count(products, eq(products.variantOf, variantOf))) >= 100)
				throw new ActionError("A product can have up to 100 variants.");
		}
		return transaction.insert(products).values({ ...values, ...variant, priceMinor, imageKey });
	}
	const [updated] = await transaction
		.update(products)
		.set({
			...values,
			variantOptions,
			variantKey,
			priceMinor,
			imageKey,
			updatedAt: new Date(),
			version: sql`${products.version} + 1`,
		})
		.where(
			and(
				eq(products.id, id),
				eq(products.version, version ?? -1),
				variantOf ? eq(products.variantOf, variantOf) : undefined,
			),
		)
		.returning({ id: products.id });
	if (!updated)
		throw new ActionError("This product changed or was removed. Refresh before saving.");
};

export const deleteProduct = (id: string, staffId?: string) =>
	inStaffAudit(staffId, async (transaction) => {
		const [product] = await transaction
			.select({ publishedAt: products.publishedAt })
			.from(products)
			.where(eq(products.id, id))
			.for("update");
		if (product?.publishedAt)
			throw new ActionError("Archive published products to retain storefront links.");
		await transaction.delete(products).where(eq(products.id, id));
	});

export const updateProductsInBulk = (
	{ selected, status, categoryId }: ZOutput<typeof bulkProductSchema>,
	staffId: string,
) =>
	inStaffAudit(staffId, async (transaction) => {
		const versions = new Map(selected.map(({ id, version }) => [id, version]));
		const where = inArray(products.id, [...versions.keys()]);
		const rows = await transaction
			.select({ id: products.id, version: products.version })
			.from(products)
			.where(where)
			.orderBy(products.id)
			.for("update");
		if (
			rows.length !== selected.length ||
			rows.some(({ id, version }) => versions.get(id) !== version)
		)
			throw new ActionError(
				"A selected product changed or was removed. Refresh before applying the update.",
			);
		await transaction
			.update(products)
			.set({
				status: status === "keep" ? undefined : status,
				categoryId: categoryId === "keep" ? undefined : categoryId || null,
				version: sql`${products.version} + 1`,
				updatedAt: sql`now()`,
			})
			.where(where);
	});
