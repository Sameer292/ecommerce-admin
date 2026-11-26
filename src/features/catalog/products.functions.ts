import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { formDataSchema, idSchema } from "@/lib/validation";
import { requireStaff, withStaffMutation } from "@/features/auth/session.server";
import { mutate } from "@/server/mutation.server";
import { categoryOptions } from "./categories.server";
import { productFormSchema, productSearchSchema } from "./catalog-validation";
import {
	deleteProduct,
	findProduct,
	listProducts,
	productHasHistory,
	saveProduct,
} from "./products.server";

export const readProducts = createServerFn()
	.validator(productSearchSchema)
	.handler(async ({ data }) => {
		await requireStaff();
		const [page, categories] = await Promise.all([listProducts(data), categoryOptions()]);
		return { ...page, categories };
	});

export const readNewProduct = createServerFn().handler(async () => {
	await requireStaff("manageCommerce");
	return categoryOptions();
});

export const readProduct = createServerFn()
	.validator(idSchema)
	.handler(async ({ data }) => {
		await requireStaff();
		const [product, categories, hasHistory] = await Promise.all([
			findProduct(data.id),
			categoryOptions(),
			productHasHistory(data.id),
		]);
		if (!product) throw notFound();
		return { product, categories, hasHistory };
	});

export const writeProduct = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(({ data }) =>
		withStaffMutation("manageCommerce", (staff) =>
			mutate(productFormSchema, data, (values) => saveProduct(values, staff.id), {
				23505: "A product already uses this SKU or slug.",
				23503: "This category no longer exists.",
			}),
		),
	);

export const removeProduct = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(({ data }) =>
		withStaffMutation("manageCommerce", (staff) =>
			mutate(idSchema, data, ({ id }) => deleteProduct(id, staff.id), {
				23503: "This product has order or inventory history. Archive it to retain its records.",
			}),
		),
	);
