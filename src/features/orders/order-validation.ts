import { z } from "zod";
import { pageSearchSchema } from "@/lib/pagination";
import { orderStatuses } from "./order-options";

export const orderSearchSchema = pageSearchSchema.extend({
	status: z.enum(orderStatuses).optional().catch(undefined),
});

export const orderDetailSearchSchema = z.object({
	page: pageSearchSchema.shape.page,
	activity: pageSearchSchema.shape.page,
});

export const orderFormSchema = z.object({
	id: z.uuid(),
	version: z.iso.datetime(),
	status: z.enum(orderStatuses),
	trackingNumber: z.string().trim().max(100),
	notes: z.string().trim().max(2_000),
});
