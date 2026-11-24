import { asc, eq, ilike } from "drizzle-orm";
import { db } from "@/db/client.server";
import { alphabetical, orderBySort } from "@/db/sort.server";
import { categories, products } from "@/db/schema/catalog";
import { pageOffset, pageSize, searchPattern } from "@/lib/pagination";
import { ActionError } from "@/server/mutation.server";
import type { CategorySearch, CategoryValues } from "./catalog.types";

const productCount = db.$count(products, eq(products.categoryId, categories.id));
const categorySortColumns = {
	name: alphabetical(categories.name),
	slug: alphabetical(categories.slug),
	count: productCount,
};

export const listCategories = async ({ page, q, sort }: CategorySearch) => {
	const where = q ? ilike(categories.name, searchPattern(q)) : undefined;
	const [rows, total] = await Promise.all([
		db
			.select({
				id: categories.id,
				name: categories.name,
				slug: categories.slug,
				description: categories.description,
				icon: categories.icon,
				createdAt: categories.createdAt,
				productCount,
			})
			.from(categories)
			.where(where)
			.orderBy(...orderBySort(categorySortColumns, sort ?? "name.asc", categories.id))
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
