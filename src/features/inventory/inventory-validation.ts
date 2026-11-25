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

export const inventorySearchSchema = pageSearchSchema.extend({
	sort: sortSchema("name", "sku", "threshold", "stock"),
	stock: ZEnum(stockFilters).optional().catch(undefined),
	status: ZEnum(productStatuses).optional().catch(undefined),
});

export const adjustmentSchema = ZObject({
	id: ZUuid(),
	productId: ZUuid(),
	delta: ZString()
		.regex(/^-?\d+$/, "Enter a whole-number adjustment.")
		.transform(Number)
		.pipe(ZInt().min(-1_000_000).max(1_000_000))
		.refine((value) => value !== 0, "Enter an adjustment other than zero."),
	reason: ZString().trim().min(1, "Enter a reason for the adjustment.").max(500),
});

export const stockHistorySearchSchema = pageSearchSchema.pick({ page: true }).extend({
	sort: sortSchema("date", "staff", "change"),
});
