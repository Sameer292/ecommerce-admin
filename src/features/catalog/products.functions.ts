import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { db } from "@/db/client.server";
import { products } from "@/db/schema/catalog";
import { formDataSchema, idSchema } from "@/lib/validation";
import { requireStaff, withStaffMutation } from "@/features/auth/session.server";
import { mutate } from "@/server/mutation.server";
import { logRequestFailure } from "@/server/request-diagnostics.server";
import { categoryOptions } from "./categories.server";
import {
	newProductSearchSchema,
	productFormSchema,
	productSearchSchema,
} from "./catalog-validation";
import type { ProductValues } from "./catalog.types";
import { discardProductUpload, productImageUrl, uploadProductImage } from "./product-media.server";
import {
	deleteProduct,
	findProduct,
	listProductVariants,
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

export const readNewProduct = createServerFn()
	.validator(newProductSearchSchema)
	.handler(async ({ data }) => {
		await requireStaff("manageCommerce");
		const sourceId = data.variantOf ?? data.duplicate;
		const [categories, source] = await Promise.all([
			categoryOptions(),
			sourceId ? findProduct(sourceId) : null,
		]);
		if ((sourceId && !source) || (data.variantOf && source?.variantOf)) throw notFound();
		const draft = source
			? {
					name: `${source.name.slice(0, data.variantOf ? 112 : 115).replace(/[\uD800-\uDBFF]$/, "")} ${data.variantOf ? "variant" : "copy"}`,
					sku: "",
					description: source.description,
					categoryId: source.categoryId,
					imageUrl: source.imageUrl,
					managedImage: productImageUrl(source.imageKey),
					imageSourceId: source.imageKey ? source.id : undefined,
					priceMinor: source.priceMinor,
					status: "draft" as const,
					variantOf: data.variantOf,
				}
			: undefined;
		return { categories, draft };
	});

export const readProduct = createServerFn()
	.validator(idSchema)
	.handler(async ({ data }) => {
		await requireStaff();
		const [product, categories, hasHistory, variants] = await Promise.all([
			findProduct(data.id),
			categoryOptions(),
			productHasHistory(data.id),
			listProductVariants(data.id),
		]);
		if (!product) throw notFound();
		return {
			product,
			categories,
			hasHistory,
			variants,
			managedImage: productImageUrl(product.imageKey),
		};
	});

const saveProductImage = async (values: ProductValues, data: FormData, staffId: string) => {
	const file = data.get("imageFile");
	const removed = data.get("removeImage") === "yes";
	const copy =
		!values.id && !removed && !values.imageUrl
			? idSchema.safeParse({ id: data.get("imageSourceId") })
			: null;
	const uploaded = file instanceof File && file.name ? await uploadProductImage(file) : undefined;
	try {
		const source = !uploaded && copy?.success ? await findProduct(copy.data.id) : undefined;
		const key = uploaded ?? (removed || values.imageUrl ? "" : source?.imageKey);
		await saveProduct({ ...values, imageUrl: uploaded ? "" : values.imageUrl }, staffId, key);
	} catch (error) {
		if (uploaded) {
			try {
				if (!(await db.$count(products, eq(products.imageKey, uploaded))))
					await discardProductUpload(uploaded);
			} catch (cleanupError) {
				logRequestFailure("discard uncommitted product image", cleanupError);
			}
		}
		throw error;
	}
};

export const writeProduct = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(({ data }) =>
		withStaffMutation("manageCommerce", (staff) =>
			mutate(productFormSchema, data, (values) => saveProductImage(values, data, staff.id), {
				23505: "This SKU, slug, or set of variant options is already in use.",
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
