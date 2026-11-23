import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { requireStaff } from "@/features/auth/session.server";
import { formDataSchema, idSchema } from "@/features/catalog/catalog-validation";
import { findProduct, listProducts } from "@/features/catalog/products.server";
import { pageSearchSchema } from "@/lib/pagination";
import { mutate } from "@/server/mutation.server";
import { adjustStock, findStockHistory } from "./inventory.server";
import { adjustmentSchema, inventorySearchSchema } from "./inventory-validation";

export const readInventory = createServerFn()
	.validator(inventorySearchSchema)
	.handler(async ({ data }) => {
		await requireStaff();
		return listProducts(data, data.stock === "low");
	});

export const readStock = createServerFn()
	.validator(idSchema.extend({ page: pageSearchSchema.shape.page }))
	.handler(async ({ data }) => {
		await requireStaff();
		const [product, history] = await Promise.all([
			findProduct(data.id),
			findStockHistory(data.id, data.page),
		]);
		if (!product) throw notFound();
		return { product, history, adjustmentId: crypto.randomUUID() };
	});

export const writeStock = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(async ({ data }) => {
		const staff = await requireStaff("manageCommerce");
		return mutate(adjustmentSchema, data, (value) => adjustStock({ ...value, staffId: staff.id }), {
			23503: "This product no longer exists.",
		});
	});
