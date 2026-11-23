import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db/client.server";
import { categories, products } from "@/db/schema/catalog";
import { productSearchSchema } from "@/features/catalog/catalog-validation";
import { pageOffset, pageSize, searchPattern } from "@/lib/pagination";
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
	category: { id: categories.id, name: categories.name, slug: categories.slug },
};

const publishedCatalog = async (request: Request) => {
	const params = new URL(request.url).searchParams;
	const { q, page, category } = productSearchSchema.parse(Object.fromEntries(params));
	const pattern = searchPattern(q);
	const where = and(
		eq(products.status, "active"),
		category ? eq(products.categoryId, category) : undefined,
		q ? or(ilike(products.name, pattern), ilike(products.sku, pattern)) : undefined,
	);
	const [items, total] = await Promise.all([
		db
			.select(publishedFields)
			.from(products)
			.leftJoin(categories, eq(products.categoryId, categories.id))
			.where(where)
			.orderBy(asc(products.name), asc(products.id))
			.limit(pageSize)
			.offset(pageOffset(page)),
		db.$count(products, where),
	]);
	return { items, page, pageSize, total, currency: env.STORE_CURRENCY };
};

export const handleStoreCatalog = async ({ request }: { request: Request }) => {
	const blocked = checkIntegrationToken(request);
	if (blocked) return blocked;
	try {
		return Response.json(await publishedCatalog(request));
	} catch (error) {
		return integrationError(error);
	}
};
