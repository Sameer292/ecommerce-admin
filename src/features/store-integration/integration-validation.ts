import { z } from "zod";
import { maxMinorAmount } from "@/lib/money";

const amount = z.int().min(0).max(maxMinorAmount);
const timestamp = z.iso.datetime({ offset: true }).transform((value) => new Date(value));
const orderNumber = z
	.string()
	.trim()
	.min(1)
	.max(80)
	.regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);
const sku = z.string().trim().min(1).max(80).toUpperCase();

const line = z.object({
	sku,
	name: z.string().trim().min(1).max(120),
	quantity: z.int().min(1).max(1_000_000),
	unitPriceMinor: amount,
});

const customer = z.object({
	name: z.string().trim().min(1).max(120),
	email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
	phone: z.string().trim().max(40).default(""),
});

export const paymentUpdateSchema = z.discriminatedUnion("status", [
	z.object({ number: orderNumber, status: z.literal("paid"), paidAt: timestamp }),
	z.object({ number: orderNumber, status: z.literal("refunded") }),
]);

export const importOrderSchema = z.object({
	number: orderNumber,
	currency: z.string().regex(/^[A-Z]{3}$/),
	createdAt: timestamp,
	paidAt: timestamp.optional(),
	customer,
	items: z.array(line).min(1).max(100),
	shippingMinor: amount.default(0),
	taxMinor: amount.default(0),
	discountMinor: amount.default(0),
	shippingName: z.string().trim().max(120).default(""),
	shippingAddress: z.string().trim().max(1_000).default(""),
});
