import {
	enum as ZEnum,
	int as ZInt,
	object as ZObject,
	string as ZString,
	uuid as ZUuid,
} from "zod";
import { productStatuses, stockFilters } from "@/features/catalog/catalog-options";
import { pageSearchSchema } from "@/lib/pagination";
import { sortSchema } from "@/lib/sort";
import { adjustmentKinds } from "./stock-adjustment";

export const inventorySearchSchema = pageSearchSchema.extend({
	sort: sortSchema("name", "sku", "stock"),
	stock: ZEnum(stockFilters).optional().catch(undefined),
	status: ZEnum(productStatuses).optional().catch(undefined),
});

export const adjustmentSchema = ZObject({
	id: ZUuid(),
	productId: ZUuid(),
	kind: ZEnum(adjustmentKinds),
	quantity: ZString()
		.regex(/^-?\d+$/, "Enter a whole number.")
		.transform(Number)
		.pipe(ZInt().min(-1_000_000).max(2_147_483_647)),
	base: ZString().max(50),
	reason: ZString().trim().min(1, "Enter a reason for the adjustment.").max(500),
	reference: ZString()
		.trim()
		.max(120)
		.transform((value) => value || undefined)
		.optional(),
}).refine(
	({ kind, quantity }) =>
		kind === "correction"
			? quantity !== 0 && quantity <= 1_000_000
			: quantity >= (kind === "receiving" ? 1 : 0),
	{ path: ["quantity"], message: "Enter a quantity allowed for this adjustment." },
);

export const stockHistorySearchSchema = pageSearchSchema
	.pick({ page: true, perPage: true })
	.extend({
		sort: sortSchema("date", "staff", "change"),
	});
