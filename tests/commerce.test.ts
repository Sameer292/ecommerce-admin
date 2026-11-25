import assert from "node:assert/strict";
import { test } from "node:test";
import {
	canChangePaymentCollection,
	canTransitionOrder,
	fulfillmentPaymentProblem,
} from "../src/features/orders/order-options";
import { buildTrend, reportWindow } from "../src/features/overview/report-dates";
import { customReportRangeSchema } from "../src/features/overview/overview-validation";
import { importOrderSchema } from "../src/features/store-integration/integration-validation";
import { formatDateTime } from "../src/lib/format";

test("operational timestamps display the local reporting time across midnight", () => {
	const date = new Date("2026-06-01T21:30:00Z");
	assert.match(formatDateTime(date, "Asia/Kathmandu"), /Jun 2, 2026.*3:15 AM/);
	assert.match(formatDateTime(date, "UTC"), /Jun 1, 2026.*9:30 PM/);
});

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
		today: "2026-03-08",
		timeZone: "America/New_York",
	});
	const trend = buildTrend(
		new Map([
			["2026-03-08", 200],
			["2026-03-09", 800],
		]),
		window,
	);
	assert.equal(trend.length, 7);
	assert.deepEqual(trend[6], {
		date: "2026-03-08",
		through: "2026-03-08",
		sales: 200,
		partial: true,
	});
	assert.deepEqual(trend[0], {
		date: "2026-03-02",
		through: "2026-03-02",
		sales: 0,
		partial: false,
	});
	const weekly = buildTrend(new Map(), reportWindow(90, "America/New_York", now));
	assert.equal(weekly.length, 13);
	assert.deepEqual(weekly[12], {
		date: "2026-03-03",
		through: "2026-03-08",
		sales: 0,
		partial: true,
	});
});

test("custom reports compare equal inclusive calendar ranges", () => {
	const range = customReportRangeSchema.parse({ from: "2026-03-07", through: "2026-03-09" });
	const window = reportWindow(range, "America/New_York", new Date("2026-03-20T12:00:00Z"));
	assert.equal(window.currentFrom, "2026-03-07");
	assert.equal(window.from, "2026-03-04");
	assert.equal(window.to, "2026-03-10");
	assert.equal(buildTrend(new Map(), window).length, 3);
	assert.equal(
		customReportRangeSchema.safeParse({ from: range.through, through: range.from }).success,
		false,
	);
	assert.equal(
		customReportRangeSchema.safeParse({ from: "2025-01-01", through: range.from }).success,
		false,
	);
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

test("dispatch requires payment or cash on delivery, and refunds prevent dispatch", () => {
	assert.match(
		fulfillmentPaymentProblem("processing", "shipped", "pending", false) ?? "",
		/Record payment/,
	);
	assert.equal(fulfillmentPaymentProblem("processing", "shipped", "pending", true), undefined);
	assert.equal(fulfillmentPaymentProblem("processing", "shipped", "paid", false), undefined);
	assert.match(
		fulfillmentPaymentProblem("processing", "shipped", "refunded", true) ?? "",
		/Refunded/,
	);
	assert.equal(fulfillmentPaymentProblem("shipped", "delivered", "refunded", false), undefined);
	assert.equal(fulfillmentPaymentProblem("processing", "cancelled", "refunded", false), undefined);
	assert.ok(canChangePaymentCollection("processing", "pending"));
	assert.equal(canChangePaymentCollection("shipped", "pending"), false);
});
