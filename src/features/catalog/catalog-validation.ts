import {
	array as ZArray,
	enum as ZEnum,
	int as ZInt,
	literal as ZLiteral,
	object as ZObject,
	string as ZString,
	union as ZUnion,
	url as ZUrl,
	uuid as ZUuid,
} from "zod";
import { maxMinorAmount, parseMoneyInput } from "@/lib/money";
import { pageSearchSchema } from "@/lib/pagination";
import { sortSchema } from "@/lib/sort";
import { editVersionSchema, optionalId } from "@/lib/validation";
import { categoryIcons, productStatuses } from "./catalog-options";

export const categorySearchSchema = pageSearchSchema.extend({
	sort: sortSchema("name", "slug", "count"),
});

const priceMinor = ZInt().min(0).max(maxMinorAmount);
const priceBound = priceMinor.optional().catch(undefined);
export const productSearchSchema = pageSearchSchema
	.extend({
		sort: sortSchema("name", "category", "price", "stock", "date"),
		status: ZEnum(productStatuses).optional().catch(undefined),
		category: ZUuid().optional().catch(undefined),
		minPriceMinor: priceBound,
		maxPriceMinor: priceBound,
	})
	.transform((search) => {
		const { minPriceMinor, maxPriceMinor } = search;
		if (
			minPriceMinor !== undefined &&
			maxPriceMinor !== undefined &&
			minPriceMinor > maxPriceMinor
		) {
			return { ...search, minPriceMinor: maxPriceMinor, maxPriceMinor: minPriceMinor };
		}
		return search;
	});

export const readPriceBounds = (minimum: string, maximum: string, currency: string) => {
	const minPriceMinor = minimum.trim() ? parseMoneyInput(minimum.trim(), currency) : undefined;
	const maxPriceMinor = maximum.trim() ? parseMoneyInput(maximum.trim(), currency) : undefined;
	if (minPriceMinor === null || maxPriceMinor === null) return null;
	if (minPriceMinor !== undefined && maxPriceMinor !== undefined && minPriceMinor > maxPriceMinor)
		return null;
	return { minPriceMinor, maxPriceMinor };
};

export const readProductFilters = (form: FormData, currency: string) => {
	const bounds = readPriceBounds(
		String(form.get("minPrice") ?? ""),
		String(form.get("maxPrice") ?? ""),
		currency,
	);
	return bounds ? productSearchSchema.parse({ ...Object.fromEntries(form), ...bounds }) : null;
};

const slug = ZString()
	.trim()
	.max(100)
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens for the slug.");

const catalogFormSchema = ZObject({
	id: optionalId,
	version: editVersionSchema.optional(),
	slug,
	description: ZString().trim().max(1_000),
});

export const categoryFormSchema = catalogFormSchema.extend({
	name: ZString().trim().min(1, "Enter a category name.").max(120),
	icon: ZEnum(categoryIcons, "Choose a category icon.").optional(),
});

export const httpsImageUrlPattern = "[Hh][Tt][Tt][Pp][Ss]://.+";
const imageUrlError = "Enter an HTTPS image URL.";

export const productFormSchema = catalogFormSchema.extend({
	name: ZString().trim().min(1, "Enter a product name.").max(120),
	sku: ZString()
		.trim()
		.min(1, "Enter a SKU.")
		.max(80)
		.transform((value) => value.toUpperCase()),
	imageUrl: ZString()
		.trim()
		.max(2_000)
		.pipe(
			ZUnion(
				[
					ZLiteral(""),
					ZString()
						.regex(new RegExp(`^${httpsImageUrlPattern}$`), imageUrlError)
						.pipe(ZUrl({ protocol: /^https$/, error: imageUrlError })),
				],
				{ error: imageUrlError },
			),
		),
	categoryId: ZUnion([ZUuid(), ZLiteral("")]).transform((value) => value || null),
	status: ZEnum(productStatuses),
	price: ZString().trim().min(1, "Enter a price.").max(24),
	lowStockThreshold: ZString()
		.regex(/^\d+$/, "Enter a whole number for the low-stock threshold.")
		.transform(Number)
		.pipe(ZInt().min(0).max(1_000_000)),
});

export const newProductSearchSchema = ZObject({ duplicate: ZUuid().optional().catch(undefined) });

export const bulkProductSchema = ZObject({
	selected: ZString()
		.max(4_000)
		.transform((value) => {
			try {
				return JSON.parse(value) as unknown;
			} catch {
				return null;
			}
		})
		.pipe(
			ZArray(ZObject({ id: ZUuid(), version: ZInt().min(0).max(2_147_483_647) }))
				.min(1)
				.max(50)
				.refine((rows) => new Set(rows.map((row) => row.id)).size === rows.length),
		),
	status: ZEnum(["keep", ...productStatuses]),
	categoryId: ZUnion([ZLiteral(["keep", ""]), ZUuid()]),
}).refine(
	({ status, categoryId }) => status !== "keep" || categoryId !== "keep",
	"Choose a status or category change.",
);
