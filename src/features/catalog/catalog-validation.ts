import { z } from "zod";
import { maxMinorAmount, parseMoneyInput } from "@/lib/money";
import { pageSearchSchema } from "@/lib/pagination";
import { optionalId } from "@/lib/validation";
import { productStatuses } from "./catalog-options";

export const categorySearchSchema = pageSearchSchema;

const priceBound = z.int().min(0).max(maxMinorAmount).optional().catch(undefined);

export const productSearchSchema = pageSearchSchema.extend({
	status: z.enum(productStatuses).optional().catch(undefined),
	category: z.uuid().optional().catch(undefined),
	minPriceMinor: priceBound,
	maxPriceMinor: priceBound,
});

export const readProductFilters = (form: FormData, currency: string) => {
	const minimum = String(form.get("minPrice") ?? "");
	const maximum = String(form.get("maxPrice") ?? "");
	const minPriceMinor = parseMoneyInput(minimum, currency);
	const maxPriceMinor = parseMoneyInput(maximum, currency);
	if ((minimum && minPriceMinor === null) || (maximum && maxPriceMinor === null)) return null;
	return productSearchSchema.parse({
		...Object.fromEntries(form),
		minPriceMinor: minPriceMinor ?? undefined,
		maxPriceMinor: maxPriceMinor ?? undefined,
	});
};

const slug = z
	.string()
	.trim()
	.max(100)
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens for the slug.");

export const categoryFormSchema = z.object({
	id: optionalId,
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
