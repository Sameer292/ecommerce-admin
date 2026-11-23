import { z } from "zod";
import { pageSearchSchema } from "@/lib/pagination";
import { productStatuses } from "./catalog-options";

export const idSchema = z.object({ id: z.uuid() });
export const formDataSchema = z.instanceof(FormData);

export const categorySearchSchema = pageSearchSchema;

export const productSearchSchema = pageSearchSchema.extend({
	status: z.enum(productStatuses).optional().catch(undefined),
	category: z.uuid().optional().catch(undefined),
});

const slug = z
	.string()
	.trim()
	.max(100)
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens for the slug.");

export const categoryFormSchema = z.object({
	id: z.union([z.uuid(), z.literal("")]).transform((id) => id || undefined),
	name: z.string().trim().min(1, "Enter a category name.").max(120),
	slug,
	description: z.string().trim().max(1_000),
});

export const productFormSchema = z.object({
	...categoryFormSchema.shape,
	sku: z
		.string()
		.trim()
		.min(1, "Enter a SKU.")
		.max(80)
		.transform((value) => value.toUpperCase()),
	imageUrl: z.union([z.literal(""), z.url({ protocol: /^https$/ })]).pipe(z.string().max(2_000)),
	categoryId: z.union([z.uuid(), z.literal("")]).transform((value) => value || null),
	status: z.enum(productStatuses),
	price: z.string().trim().min(1, "Enter a price.").max(24),
	lowStockThreshold: z
		.string()
		.regex(/^\d+$/, "Enter a whole number for the low-stock threshold.")
		.transform(Number)
		.pipe(z.int().min(0).max(1_000_000)),
});
