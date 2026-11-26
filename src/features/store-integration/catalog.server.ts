import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db/client.server";
import { availableStock, categories, products, productSlugs } from "@/db/schema/catalog";
import { productSearchSchema, publishedSlugSchema } from "@/features/catalog/catalog-validation";
import { pageOffset, pageSize, searchPattern } from "@/lib/pagination";
import { getStoreCurrency } from "@/features/settings/store-currency.server";
import { env } from "@/server/env.server";
import { checkIntegrationToken } from "./integration-auth.server";
import { integrationError } from "./integration-request.server";

const publishedFields = {
	id: products.id,
	name: products.name,
	slug: products.slug,
	description: products.description,
	sku: products.sku,
	imageUrl: products.imageUrl,
	priceMinor: products.priceMinor,
	stock: products.stock,
	availableStock,
	category: { id: categories.id, name: categories.name, slug: categories.slug },
};

const publicStock = <Item extends { availableStock: number }>(item: Item) => ({
	...item,
	availableStock: env.STORE_INVENTORY_AUTHORITY === "admin" ? item.availableStock : null,
});

const publishedCatalog = async (request: Request) => {
	const params = new URL(request.url).searchParams;
	const { q, page, category } = productSearchSchema.parse(Object.fromEntries(params));
	const pattern = searchPattern(q);
	const where = and(
		eq(products.status, "active"),
		category ? eq(products.categoryId, category) : undefined,
		q ? or(ilike(products.name, pattern), ilike(products.sku, pattern)) : undefined,
	);
	const [items, total, currency] = await Promise.all([
		db
			.select(publishedFields)
			.from(products)
			.leftJoin(categories, eq(products.categoryId, categories.id))
			.where(where)
			.orderBy(asc(products.name), asc(products.id))
			.limit(pageSize)
			.offset(pageOffset(page)),
		db.$count(products, where),
		getStoreCurrency(),
	]);
	const authority = env.STORE_INVENTORY_AUTHORITY;
	return {
		items: items.map(publicStock),
		page,
		pageSize,
		total,
		currency,
		inventoryAuthority: authority,
	};
};

const publishedProduct = async (slug: string) => {
	const [item] = await db
		.select(publishedFields)
		.from(productSlugs)
		.innerJoin(products, eq(products.id, productSlugs.productId))
		.leftJoin(categories, eq(products.categoryId, categories.id))
		.where(and(eq(productSlugs.slug, slug), eq(products.status, "active")));
	if (!item) return Response.json({ error: "Product not found." }, { status: 404 });
	return Response.json({
		item: publicStock(item),
		canonicalSlug: item.slug,
		redirected: slug !== item.slug,
		currency: await getStoreCurrency(),
		inventoryAuthority: env.STORE_INVENTORY_AUTHORITY,
	});
};

export const handleStoreCatalog = async ({ request }: { request: Request }) => {
	const blocked = await checkIntegrationToken(request, "catalog:read");
	if (blocked) return blocked;
	try {
		const slug = new URL(request.url).searchParams.get("slug");
		if (slug !== null) {
			const parsed = publishedSlugSchema.safeParse(slug);
			return parsed.success
				? await publishedProduct(parsed.data)
				: Response.json({ error: "Invalid product slug." }, { status: 400 });
		}
		return Response.json(await publishedCatalog(request));
	} catch (error) {
		return integrationError(error);
	}
};
