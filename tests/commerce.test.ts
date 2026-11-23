import assert from "node:assert/strict";
import { test } from "node:test";
import { canTransitionOrder } from "../src/features/orders/order-options";
import { buildTrend, reportWindow } from "../src/features/overview/report-dates";
import { importOrderSchema } from "../src/features/store-integration/integration-validation";

test("fulfillment permits forward progress and rejects jumps and reopening", () => {
	assert.ok(canTransitionOrder("pending", "processing"));
	assert.ok(canTransitionOrder("processing", "cancelled"));
	assert.ok(canTransitionOrder("shipped", "delivered"));
	assert.ok(canTransitionOrder("delivered", "delivered"));
	assert.equal(canTransitionOrder("pending", "delivered"), false);
	assert.equal(canTransitionOrder("cancelled", "processing"), false);
});

test("dashboard periods use the store's calendar day and fill missing dates", () => {
	const now = new Date("2026-03-09T01:00:00Z");
	const window = reportWindow(7, "America/New_York", now);
	assert.deepEqual(window, {
		from: "2026-02-23",
		currentFrom: "2026-03-02",
		to: "2026-03-09",
		timeZone: "America/New_York",
	});
	const trend = buildTrend(
		new Map([
			["2026-03-08", 200],
			["2026-03-09", 800],
		]),
		window,
		7,
	);
	assert.equal(trend.length, 7);
	assert.deepEqual(trend[6], { date: "2026-03-08", sales: 200 });
	assert.deepEqual(trend[0], { date: "2026-03-02", sales: 0 });
});

test("integration accepts integer minor units and normalizes snapshots", () => {
	const input = {
		number: "DEMO-100",
		currency: "USD",
		createdAt: "2026-06-01T15:00:00-04:00",
		customer: { name: "Taylor", email: " TAYLOR@EXAMPLE.TEST " },
		items: [{ sku: "  test-1", name: "Notebook", quantity: 2, unitPriceMinor: 1499 }],
	};
	const order = importOrderSchema.parse(input);
	assert.equal(order.createdAt.toISOString(), "2026-06-01T19:00:00.000Z");
	assert.equal(order.customer.email, "taylor@example.test");
	assert.equal(order.items[0].sku, "TEST-1");
	assert.equal(
		importOrderSchema.safeParse({ ...input, items: [{ ...input.items[0], unitPriceMinor: 12.49 }] })
			.success,
		false,
	);
});
