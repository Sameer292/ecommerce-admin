import {
	enum as ZEnum,
	iso as ZIso,
	object as ZObject,
	string as ZString,
	uuid as ZUuid,
} from "zod";
import { pageSearchSchema } from "@/lib/pagination";
import { sortSchema } from "@/lib/sort";
import { orderStatuses } from "./order-options";

export const orderSearchSchema = pageSearchSchema.extend({
	sort: sortSchema("number", "customer", "date", "total"),
	status: ZEnum(orderStatuses).optional().catch(undefined),
});

export const orderDetailSearchSchema = ZObject({
	page: pageSearchSchema.shape.page,
	activity: pageSearchSchema.shape.page,
	payments: pageSearchSchema.shape.page,
	sort: sortSchema("name", "quantity", "price", "total"),
	activitySort: sortSchema("date", "staff"),
});

export const orderFormSchema = ZObject({
	id: ZUuid(),
	version: ZIso.datetime(),
	status: ZEnum(orderStatuses),
	cashOnDelivery: ZEnum(["prepaid", "cod"])
		.transform((value) => value === "cod")
		.optional(),
	trackingNumber: ZString().trim().max(100),
	notes: ZString().trim().max(2_000),
});
