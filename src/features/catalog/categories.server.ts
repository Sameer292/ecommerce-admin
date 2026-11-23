import { asc, eq, ilike } from "drizzle-orm";
import { db } from "@/db/client.server";
import { categories, products } from "@/db/schema/catalog";
import { pageOffset, pageSize, searchPattern } from "@/lib/pagination";
import { ActionError } from "@/server/mutation.server";
import type { CategorySearch, CategoryValues } from "./catalog.types";

export const listCategories = async ({ page, q }: CategorySearch) => {
	const where = q ? ilike(categories.name, searchPattern(q)) : undefined;
	const [rows, total] = await Promise.all([
		db
			.select({
				id: categories.id,
				name: categories.name,
				slug: categories.slug,
				description: categories.description,
				createdAt: categories.createdAt,
				productCount: db.$count(products, eq(products.categoryId, categories.id)),
			})
			.from(categories)
			.where(where)
			.orderBy(asc(categories.name), asc(categories.id))
			.limit(pageSize)
			.offset(pageOffset(page)),
		db.$count(categories, where),
	]);
	return { rows, total };
};

export const categoryOptions = () =>
	db
		.select({ id: categories.id, name: categories.name })
		.from(categories)
		.orderBy(asc(categories.name), asc(categories.id));

export const findCategory = async (id: string) => {
	const [category] = await db.select().from(categories).where(eq(categories.id, id));
	return category;
};

export const saveCategory = async ({ id, ...values }: CategoryValues) => {
	if (!id) return db.insert(categories).values(values);
	const [updated] = await db
		.update(categories)
		.set(values)
		.where(eq(categories.id, id))
		.returning({ id: categories.id });
	if (!updated) throw new ActionError("This category no longer exists.");
};

export const deleteCategory = (id: string) => db.delete(categories).where(eq(categories.id, id));
