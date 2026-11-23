import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { requireStaff } from "@/features/auth/session.server";
import { mutate } from "@/server/mutation.server";
import { categoryOptions, findCategory } from "./categories.server";
import {
	formDataSchema,
	idSchema,
	productFormSchema,
	productSearchSchema,
} from "./catalog-validation";
import { deleteProduct, findProduct, listProducts, saveProduct } from "./products.server";

export const readProducts = createServerFn()
	.validator(productSearchSchema)
	.handler(async ({ data }) => {
		await requireStaff();
		const [page, category] = await Promise.all([
			listProducts(data),
			data.category ? findCategory(data.category) : undefined,
		]);
		return { ...page, category };
	});

export const readNewProduct = createServerFn().handler(async () => {
	await requireStaff("manageCommerce");
	return categoryOptions();
});

export const readProduct = createServerFn()
	.validator(idSchema)
	.handler(async ({ data }) => {
		await requireStaff();
		const [product, categories] = await Promise.all([findProduct(data.id), categoryOptions()]);
		if (!product) throw notFound();
		return { product, categories };
	});

export const writeProduct = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(async ({ data }) => {
		await requireStaff("manageCommerce");
		return mutate(productFormSchema, data, saveProduct, {
			23505: "A product already uses this SKU or slug.",
			23503: "This category no longer exists.",
		});
	});

export const removeProduct = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(async ({ data }) => {
		await requireStaff("manageCommerce");
		return mutate(idSchema, data, ({ id }) => deleteProduct(id), {
			23503: "This product has order or inventory history. Archive it to retain its records.",
		});
	});
