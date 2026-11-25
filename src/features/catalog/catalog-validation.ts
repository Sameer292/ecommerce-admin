import {
	enum as ZEnum,
	int as ZInt,
	literal as ZLiteral,
	object as ZObject,
	string as ZString,
	tuple as ZTuple,
	union as ZUnion,
	url as ZUrl,
	uuid as ZUuid,
} from "zod";
import { maxMinorAmount } from "@/lib/money";
import { pageSearchSchema } from "@/lib/pagination";
import { sortSchema } from "@/lib/sort";
import { optionalId } from "@/lib/validation";
import { categoryIcons, productStatuses } from "./catalog-options";

export const categorySearchSchema = pageSearchSchema.extend({
	sort: sortSchema("name", "slug", "count"),
});

const priceMinor = ZInt().min(0).max(maxMinorAmount);
const priceBound = priceMinor.optional().catch(undefined);
const sliderAmount = ZString().regex(/^\d+$/).transform(Number).pipe(priceMinor);
const sliderRange = ZTuple([sliderAmount, sliderAmount]);

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

export const readProductFilters = (form: FormData, priceCeiling: number) => {
	const values = form.getAll("priceRange");
	if (values.length === 0) return productSearchSchema.parse(Object.fromEntries(form));
	const parsed = sliderRange.safeParse(values);
	if (!parsed.success) return null;
	const [min, max] = parsed.data;
	if (min > max || max > priceCeiling) return null;
	return productSearchSchema.parse({
		...Object.fromEntries(form),
		minPriceMinor: min === 0 ? undefined : min,
		maxPriceMinor: max === priceCeiling ? undefined : max,
	});
};

const slug = ZString()
	.trim()
	.max(100)
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens for the slug.");

const catalogFormSchema = ZObject({
	id: optionalId,
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
