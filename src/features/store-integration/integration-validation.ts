import {
	array as ZArray,
	discriminatedUnion as ZDiscriminatedUnion,
	email as ZEmail,
	int as ZInt,
	iso as ZIso,
	literal as ZLiteral,
	object as ZObject,
	string as ZString,
} from "zod";
import { maxMinorAmount } from "@/lib/money";

const amount = ZInt().min(0).max(maxMinorAmount);
const timestamp = ZIso.datetime({ offset: true }).transform((value) => new Date(value));
const orderNumber = ZString()
	.trim()
	.min(1)
	.max(80)
	.regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);
export const orderStatusQuerySchema = ZObject({ number: orderNumber });
const sku = ZString().trim().min(1).max(80).toUpperCase();

const line = ZObject({
	sku,
	name: ZString().trim().min(1).max(120),
	quantity: ZInt().min(1).max(1_000_000),
	unitPriceMinor: amount,
});

const customer = ZObject({
	name: ZString().trim().min(1).max(120),
	email: ZString().trim().toLowerCase().max(254).pipe(ZEmail()),
	phone: ZString().trim().max(40).default(""),
});

const externalId = ZString().trim().min(1).max(120);
const paymentDetails = ZObject({
	number: orderNumber,
	externalId: externalId.optional(),
	source: ZString().trim().min(1).max(80).optional(),
	method: ZString().trim().min(1).max(80).optional(),
	amountMinor: amount.optional(),
});

export const paymentUpdateSchema = ZDiscriminatedUnion("status", [
	paymentDetails.extend({ status: ZLiteral("paid"), paidAt: timestamp }),
	paymentDetails.extend({ status: ZLiteral("refunded"), refundedAt: timestamp.optional() }),
	paymentDetails.extend({
		status: ZLiteral("failed"),
		failedAt: timestamp,
		externalId,
		amountMinor: amount,
	}),
]);

export const importOrderSchema = ZObject({
	number: orderNumber,
	currency: ZString().regex(/^[A-Z]{3}$/),
	createdAt: timestamp,
	paidAt: timestamp.optional(),
	customer,
	items: ZArray(line).min(1).max(100),
	shippingMinor: amount.default(0),
	taxMinor: amount.default(0),
	discountMinor: amount.default(0),
	shippingName: ZString().trim().max(120).default(""),
	shippingAddress: ZString().trim().max(1_000).default(""),
});
