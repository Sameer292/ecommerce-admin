import { z } from "zod";
import { stockFilters } from "@/features/catalog/catalog-options";
import { pageSearchSchema } from "@/lib/pagination";
import { sortSchema } from "@/lib/sort";

export const inventorySearchSchema = pageSearchSchema.extend({
	sort: sortSchema("name", "sku", "threshold", "stock"),
	stock: z.enum(stockFilters).optional().catch(undefined),
});

export const adjustmentSchema = z.object({
	id: z.uuid(),
	productId: z.uuid(),
	delta: z
		.string()
		.regex(/^-?\d+$/, "Enter a whole-number adjustment.")
		.transform(Number)
		.pipe(z.int().min(-1_000_000).max(1_000_000))
		.refine((value) => value !== 0, "Enter an adjustment other than zero."),
	reason: z.string().trim().min(1, "Enter a reason for the adjustment.").max(500),
});

export const stockHistorySearchSchema = pageSearchSchema.pick({ page: true }).extend({
	sort: sortSchema("date", "staff", "change"),
});
