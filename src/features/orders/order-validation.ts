import { z } from "zod";
import { pageSearchSchema } from "@/lib/pagination";
import { sortSchema } from "@/lib/sort";
import { orderStatuses } from "./order-options";

export const orderSearchSchema = pageSearchSchema.extend({
	sort: sortSchema("number", "customer", "date", "total"),
	status: z.enum(orderStatuses).optional().catch(undefined),
});

export const orderDetailSearchSchema = z.object({
	page: pageSearchSchema.shape.page,
	activity: pageSearchSchema.shape.page,
	sort: sortSchema("name", "quantity", "price", "total"),
	activitySort: sortSchema("date", "staff"),
});

export const orderFormSchema = z.object({
	id: z.uuid(),
	version: z.iso.datetime(),
	status: z.enum(orderStatuses),
	trackingNumber: z.string().trim().max(100),
	notes: z.string().trim().max(2_000),
});
