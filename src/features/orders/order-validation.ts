import {
	array as ZArray,
	enum as ZEnum,
	int as ZInt,
	iso as ZIso,
	object as ZObject,
	string as ZString,
	uuid as ZUuid,
} from "zod";
import { pageSearchSchema } from "@/lib/pagination";
import { maxMinorAmount, parseMoneyInput } from "@/lib/money";
import { sortSchema } from "@/lib/sort";
import { orderStatuses, paymentStatuses } from "./order-options";

export const shippingStates = [
	"awaiting_dispatch",
	"in_transit",
	"delivered",
	"missing_tracking",
] as const;
export const orderViews = [
	"paid_to_fulfill",
	"overdue_unpaid",
	"to_fulfill",
	"open_returns",
] as const;
const dateBound = ZIso.date().optional().catch(undefined);
const amountBound = ZInt().min(0).max(maxMinorAmount).optional().catch(undefined);

export const orderSearchSchema = pageSearchSchema.extend({
	sort: sortSchema("number", "customer", "date", "total"),
	status: ZEnum(orderStatuses).optional().catch(undefined),
	payment: ZEnum(paymentStatuses).optional().catch(undefined),
	shipping: ZEnum(shippingStates).optional().catch(undefined),
	view: ZEnum(orderViews).optional().catch(undefined),
	placedFrom: dateBound,
	placedThrough: dateBound,
	minTotalMinor: amountBound,
	maxTotalMinor: amountBound,
});

export const readOrderFilters = (form: FormData, currency: string) => {
	const minimum = String(form.get("minTotal") ?? "").trim();
	const maximum = String(form.get("maxTotal") ?? "").trim();
	const minTotalMinor = minimum ? parseMoneyInput(minimum, currency) : undefined;
	const maxTotalMinor = maximum ? parseMoneyInput(maximum, currency) : undefined;
	if (minTotalMinor === null || maxTotalMinor === null) return null;
	return orderSearchSchema.parse({ ...Object.fromEntries(form), minTotalMinor, maxTotalMinor });
};

export const orderDetailSearchSchema = ZObject({
	page: pageSearchSchema.shape.page,
	activity: pageSearchSchema.shape.page,
	payments: pageSearchSchema.shape.page,
	sort: sortSchema("name", "quantity", "price", "total"),
	activitySort: sortSchema("date", "staff"),
});

export const orderDocumentSearchSchema = ZObject({
	ids: ZArray(ZUuid())
		.max(25)
		.transform((ids) => [...new Set(ids)])
		.catch([])
		.default([]),
	kind: ZEnum(["packing", "invoice"]).catch("packing").default("packing"),
});

export const orderBatchSchema = ZObject({
	ids: ZString()
		.max(1_000)
		.transform((value) => {
			try {
				return JSON.parse(value) as unknown;
			} catch {
				return null;
			}
		})
		.pipe(
			ZArray(ZUuid())
				.min(1)
				.max(25)
				.transform((ids) => [...new Set(ids)]),
		),
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
	shippingName: ZString().trim().max(120).optional(),
	shippingAddress: ZString().trim().max(1_000).optional(),
	deliveryReason: ZString().trim().max(250).optional(),
});
