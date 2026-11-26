import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { formDataSchema, idSchema } from "@/lib/validation";
import { requireStaff, withStaffMutation } from "@/features/auth/session.server";
import { mutate } from "@/server/mutation.server";
import { categoryOptions } from "./categories.server";
import {
	bulkProductSchema,
	newProductSearchSchema,
	productFormSchema,
	productSearchSchema,
} from "./catalog-validation";
import {
	deleteProduct,
	findProduct,
	listProducts,
	productHasHistory,
	saveProduct,
	updateProductsInBulk,
} from "./products.server";

export const readProducts = createServerFn()
	.validator(productSearchSchema)
	.handler(async ({ data }) => {
		await requireStaff();
		const [page, categories] = await Promise.all([listProducts(data), categoryOptions()]);
		return { ...page, categories };
	});

export const readNewProduct = createServerFn()
	.validator(newProductSearchSchema)
	.handler(async ({ data }) => {
		await requireStaff("manageCommerce");
		const [categories, source] = await Promise.all([
			categoryOptions(),
			data.duplicate ? findProduct(data.duplicate) : null,
		]);
		if (data.duplicate && !source) throw notFound();
		const draft = source
			? {
					name: `${source.name.slice(0, 115)} copy`,
					sku: "",
					description: source.description,
					categoryId: source.categoryId,
					imageUrl: source.imageUrl,
					priceMinor: source.priceMinor,
					lowStockThreshold: source.lowStockThreshold,
					status: "draft" as const,
				}
			: undefined;
		return { categories, draft };
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
				23514: "A published product’s SKU is fixed. Refresh before making changes.",
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

export const writeProductBatch = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(({ data }) =>
		withStaffMutation("manageCommerce", (staff) =>
			mutate(bulkProductSchema, data, (input) => updateProductsInBulk(input, staff.id), {
				23503: "The selected category no longer exists.",
			}),
		),
	);
