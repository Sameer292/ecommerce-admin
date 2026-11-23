import type { orderItems, orders } from "../../src/db/schema/orders";
import { currencyDigits } from "../../src/lib/format";
import { env } from "../../src/server/env.server";
import { demoProducts } from "./catalog";
import { demoCustomers } from "./customers";
import { daysAgo, demoId } from "./helpers";

type DemoOrder = typeof orders.$inferInsert;
type DemoItem = typeof orderItems.$inferInsert;

const active = demoProducts.filter((product) => product.status === "active");
const unit = 10 ** currencyDigits(env.STORE_CURRENCY);

const orderLines = (index: number): DemoItem[] =>
	Array.from({ length: 1 + (index % 3) }, (_, line) => {
		const product = active[(index * 3 + line * 7) % active.length];
		return {
			orderId: demoId(4, index),
			id: demoId(5, index * 4 + line),
			productId: product.id,
			name: product.name,
			sku: product.sku,
			quantity: 1 + ((index + line * 2) % 4),
			unitPriceMinor: product.priceMinor,
		};
	});

const orderStatus = (index: number): DemoOrder["status"] => {
	if (index % 19 === 11) return "cancelled";
	if (index < 4) return index % 2 ? "processing" : "pending";
	if (index < 10) return "shipped";
	return "delivered";
};

const orderTotals = (items: DemoItem[], index: number) => {
	const subtotalMinor = items.reduce((sum, item) => sum + item.unitPriceMinor * item.quantity, 0);
	const shippingMinor = subtotalMinor >= 120 * unit ? 0 : 8 * unit;
	const taxMinor = Math.round(subtotalMinor * 0.06);
	const discountMinor = index % 9 === 0 ? Math.round(subtotalMinor * 0.1) : 0;
	return {
		subtotalMinor,
		shippingMinor,
		taxMinor,
		discountMinor,
		totalMinor: subtotalMinor + shippingMinor + taxMinor - discountMinor,
	};
};

const orderRow = (index: number, items: DemoItem[]): DemoOrder => {
	const status = orderStatus(index);
	const paymentStatus = status === "cancelled" ? "refunded" : index % 22 === 0 ? "pending" : "paid";
	const customer = demoCustomers[index % demoCustomers.length];
	const createdAt = daysAgo(0.38 * index + 0.004 * index ** 2);
	return {
		id: demoId(4, index),
		customerId: demoId(3, index % demoCustomers.length),
		number: `DEMO-${2050 - index}`,
		status,
		paymentStatus,
		createdAt,
		paidAt: paymentStatus === "pending" ? null : createdAt,
		shippingName: customer.name,
		shippingAddress: `${100 + index} Sample Street\nPortland, OR 97205`,
		trackingNumber: status === "shipped" ? `DEMO-TRK-${index + 2040}` : "",
		...orderTotals(items, index),
	};
};

const fixtures = Array.from({ length: 121 }, (_, index) => orderLines(index));

export const demoOrders = fixtures.map((items, index) => orderRow(index, items));
export const demoItems = fixtures.flat();
