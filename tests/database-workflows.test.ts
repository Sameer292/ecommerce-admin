import assert from "node:assert/strict";
import { test } from "node:test";
import { importOrderSchema } from "../src/features/store-integration/integration-validation";

test("stock and order writes serialize retries and roll back failed changes", {
	skip: !process.env.TEST_WORKFLOW_DATABASE_URL,
	timeout: 30_000,
}, async () => {
	const originalUrl = process.env.DATABASE_URL;
	process.env.DATABASE_URL = process.env.TEST_WORKFLOW_DATABASE_URL;
	const { connection, db } = await import("../src/db/client.server");
	try {
		const existing = await connection`
			select nspname from pg_namespace where nspname in ('commerce_admin', 'auth', 'drizzle')
		`;
		assert.equal(existing.length, 0, "TEST_WORKFLOW_DATABASE_URL must point to an empty database");
		await connection.unsafe("CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY)");
		const { migrate } = await import("drizzle-orm/postgres-js/migrator");
		await migrate(db, { migrationsFolder: "./drizzle" });
		const { getStoreCurrency, lockStoreCurrency } = await import(
			"../src/features/settings/store-currency.server"
		);
		await assert.rejects(getStoreCurrency(), /Store currency is unset/);
		await lockStoreCurrency("USD");
		await lockStoreCurrency("USD");
		await assert.rejects(lockStoreCurrency("NPR"), /already locked to USD/);
		assert.equal(await getStoreCurrency(), "USD");
		await connection`
			insert into commerce_admin.staff_user (id, name, email)
			values ('stock-operator', 'Operator', 'stock@example.test')
		`;
		const [product] = await connection`
			insert into commerce_admin.products (name, slug, sku, price_minor, stock)
			values ('Test mug', 'test-mug', 'TEST-MUG', 1500, 20) returning id
		`;
		const { adjustStock } = await import("../src/features/inventory/inventory.server");
		const adjustment = {
			id: crypto.randomUUID(),
			productId: product.id,
			delta: 5,
			reason: "Receiving",
			reference: "receipt-101",
			staffId: "stock-operator",
		};
		await Promise.all([
			adjustStock(adjustment),
			adjustStock(adjustment),
			adjustStock({ ...adjustment, id: crypto.randomUUID(), delta: -2, reason: "Damage" }),
		]);
		const failedId = crypto.randomUUID();
		await assert.rejects(
			adjustStock({ ...adjustment, id: failedId, delta: -100 }),
			/outside its allowed range/,
		);
		const [stock] =
			await connection`select stock from commerce_admin.products where id = ${product.id}`;
		assert.equal(stock.stock, 23);
		const ledger =
			await connection`select id, reference, delta, before_levels, after_levels from commerce_admin.stock_adjustments`;
		assert.equal(ledger.length, 2);
		assert.ok(!ledger.some(({ id }) => id === failedId));
		assert.equal(ledger.find(({ id }) => id === adjustment.id)?.reference, "receipt-101");
		for (const entry of ledger)
			assert.equal(entry.after_levels.stock - entry.before_levels.stock, entry.delta);
		assert.ok(ledger.some(({ before_levels }) => before_levels.stock === 20));
		assert.ok(ledger.some(({ after_levels }) => after_levels.stock === 23));

		const { importOrder } = await import("../src/features/store-integration/import-order.server");
		const input = importOrderSchema.parse({
			number: "WEB-RETRY",
			currency: "USD",
			createdAt: "2026-01-01T00:00:00Z",
			customer: { name: "Buyer", email: "buyer@example.test" },
			items: [{ sku: "TEST-MUG", name: "Test mug", quantity: 1, unitPriceMinor: 1500 }],
		});
		const duplicates = await Promise.all([importOrder(input), importOrder(input)]);
		assert.equal(duplicates[0].id, duplicates[1].id);
		assert.equal(duplicates.filter(({ created }) => created).length, 1);
		assert.equal((await connection`select id from commerce_admin.order_items`).length, 1);
		const { listOrders } = await import("../src/features/orders/orders.server");
		const filters = {
			page: 1,
			q: "",
			view: "overdue_unpaid",
			payment: "pending",
			minTotalMinor: 1500,
			maxTotalMinor: 1500,
		} as const;
		assert.equal(
			(await listOrders({ ...filters, placedThrough: "2025-12-31" }, undefined, "America/New_York"))
				.total,
			1,
		);
		assert.equal(
			(await listOrders({ ...filters, placedThrough: "2025-12-31" }, undefined, "UTC")).total,
			0,
		);
		assert.equal((await listOrders({ ...filters, maxTotalMinor: 1400 })).total, 0);
		const { findOrder, saveOrder, listOrderActivity } = await import(
			"../src/features/orders/order-detail.server"
		);
		const beforeCorrection = await findOrder(duplicates[0].id);
		assert.ok(beforeCorrection);
		const change = {
			id: duplicates[0].id,
			version: beforeCorrection.order.updatedAt.toISOString(),
			status: "pending",
			trackingNumber: "",
			notes: "",
			shippingName: "Corrected Recipient",
			shippingAddress: "Corrected address",
		} as const;
		await assert.rejects(saveOrder(change, "stock-operator"), /Enter a reason/);
		await saveOrder(
			{ ...change, deliveryReason: "Buyer requested the correction." },
			"stock-operator",
		);
		const { rows: corrections } = await listOrderActivity(change.id, 1);
		assert.deepEqual(corrections[0]?.fields, ["Recipient", "Shipping address"]);
		assert.equal(corrections[0]?.reason, "Buyer requested the correction.");
		assert.equal(corrections[0]?.staffName, "Operator");
		const { findStoreOrderStatus } = await import(
			"../src/features/store-integration/orders.server"
		);
		await connection`update commerce_admin.orders set status = 'shipped', tracking_number = 'TRACK-1' where number = ${input.number}`;
		const status = await findStoreOrderStatus(input.number);
		assert.ok(status);
		assert.deepEqual(Object.keys(status).sort(), [
			"number",
			"paymentStatus",
			"shipments",
			"status",
			"trackingNumber",
			"updatedAt",
		]);
		assert.equal(status.status, "shipped");
		assert.equal(status.trackingNumber, "TRACK-1");
		const dispatched = await findOrder(change.id);
		assert.ok(dispatched);
		await assert.rejects(
			saveOrder(
				{
					...change,
					version: dispatched.order.updatedAt.toISOString(),
					status: "shipped",
					shippingName: "Too late",
					deliveryReason: "After dispatch",
				},
				"stock-operator",
			),
			/before dispatch/,
		);
		assert.equal(await findStoreOrderStatus("UNKNOWN"), undefined);
		await connection`update commerce_admin.customers set name = 'New Name', phone = '+1 555 0100' where email = ${input.customer.email}`;
		const detail = await findOrder(duplicates[0].id);
		assert.equal(detail?.order.buyerName, "Buyer");
		assert.equal(detail.order.buyerEmail, "buyer@example.test");
		assert.equal(detail.order.buyerPhone, "");
		await assert.rejects(importOrder({ ...input, shippingMinor: 500 }), { status: 409 });
		await assert.rejects(
			importOrder({
				...input,
				number: "WEB-ROLLBACK",
				customer: { ...input.customer, email: "rollback@example.test" },
				discountMinor: 1501,
			}),
			{ status: 400 },
		);
		assert.equal(
			(
				await connection`select id from commerce_admin.customers where email = 'rollback@example.test'`
			).length,
			0,
		);
		assert.equal((await connection`select id from commerce_admin.orders`).length, 1);

		const { updatePayment } = await import("../src/features/store-integration/payment.server");
		const { number } = input;
		await assert.rejects(updatePayment({ number, status: "refunded" }), { status: 409 });
		const paidAt = new Date("2026-01-02T00:00:00Z");
		await updatePayment({ number, status: "paid", paidAt });
		await updatePayment({ number, status: "refunded" });
		await assert.rejects(updatePayment({ number, status: "paid", paidAt }), { status: 409 });
		const [payment] = await connection`
			select payment_status, paid_at = ${paidAt.toISOString()}::timestamptz as same_time
			from commerce_admin.orders where number = ${number}
		`;
		assert.deepEqual(payment, { payment_status: "refunded", same_time: true });

		const split = await importOrder({
			...input,
			number: "WEB-SPLIT",
			cashOnDelivery: true,
			items: [{ ...input.items[0], quantity: 2 }],
		});
		const splitOrder = await findOrder(split.id);
		assert.ok(splitOrder);
		await saveOrder(
			{
				id: split.id,
				version: splitOrder.order.updatedAt.toISOString(),
				status: "processing",
				trackingNumber: "",
				notes: "",
			},
			"stock-operator",
		);
		const { listOrderShipments, saveShipment } = await import(
			"../src/features/orders/shipments.server"
		);
		const first = await findOrder(split.id);
		assert.ok(first);
		const { remaining } = await listOrderShipments(split.id);
		const packageData = {
			id: crypto.randomUUID(),
			orderId: split.id,
			version: first.order.updatedAt.toISOString(),
			carrier: "Test Carrier",
			service: "Express",
			trackingNumber: "A100",
			trackingUrl: "https://tracking.example.test/A100",
			lines: [{ itemId: remaining[0].id, quantity: 1 }],
		};
		await Promise.all([
			saveShipment(packageData, "stock-operator"),
			saveShipment(packageData, "stock-operator"),
		]);
		const partial = await findOrder(split.id);
		assert.ok(partial);
		assert.equal(partial.order.status, "processing");
		await assert.rejects(
			saveOrder(
				{
					...change,
					id: split.id,
					version: partial.order.updatedAt.toISOString(),
					status: "processing",
					deliveryReason: "After partial dispatch",
				},
				"stock-operator",
			),
			/first package dispatch/,
		);
		const second = {
			...packageData,
			id: crypto.randomUUID(),
			version: partial.order.updatedAt.toISOString(),
			trackingNumber: "A101",
		};
		await assert.rejects(
			saveShipment({ ...second, lines: [{ ...second.lines[0], quantity: 2 }] }, "stock-operator"),
			/exceed/,
		);
		await saveShipment(second, "stock-operator");
		const shipped = await findStoreOrderStatus("WEB-SPLIT");
		assert.equal(shipped?.status, "shipped");
		assert.deepEqual(
			shipped.shipments.map(({ trackingNumber }) => trackingNumber),
			["A100", "A101"],
		);
		assert.deepEqual((await listOrderShipments(split.id)).remaining, []);

		const { writeReturn, listOrderReturns } = await import(
			"../src/features/orders/order-returns.server"
		);
		const { refundedAmount } = await import("../src/features/store-integration/payment.server");
		const requested = {
			action: "request",
			id: crypto.randomUUID(),
			orderId: split.id,
			itemId: remaining[0].id,
			quantity: 1,
			reason: "Returned unopened",
		} as const;
		await writeReturn(requested, "stock-operator");
		await assert.rejects(
			writeReturn({ ...requested, id: crypto.randomUUID(), quantity: 2 }, "stock-operator"),
			/exceeds the dispatched quantity/,
		);
		await assert.rejects(
			writeReturn({ ...requested, action: "receive", restock: true }, "stock-operator"),
			/current status/,
		);
		await writeReturn({ ...requested, action: "approve" }, "stock-operator");
		await Promise.all([
			writeReturn({ ...requested, action: "receive", restock: true }, "stock-operator"),
			writeReturn({ ...requested, action: "receive", restock: true }, "stock-operator"),
		]);
		const [restocked] =
			await connection`select stock from commerce_admin.products where id = ${product.id}`;
		assert.equal(restocked.stock, 24);
		const [stockReturn] =
			await connection`select reference, before_levels, after_levels from commerce_admin.stock_adjustments where id = ${requested.id}`;
		assert.equal(stockReturn.reference, requested.id);
		assert.equal(stockReturn.before_levels.stock, 23);
		assert.equal(stockReturn.after_levels.stock, 24);
		await updatePayment({ number: "WEB-SPLIT", status: "paid", paidAt });
		const refund = {
			number: "WEB-SPLIT",
			status: "refunded",
			amountMinor: 1500,
			externalId: "RETURN-1",
			returnId: requested.id,
		} as const;
		assert.equal((await updatePayment(refund)).paymentStatus, "paid");
		assert.equal((await updatePayment(refund)).paymentStatus, "paid");
		assert.equal(await refundedAmount(split.id), 1500);
		assert.equal((await listOrderReturns(split.id)).returns[0].record.status, "refunded");
		await assert.rejects(
			updatePayment({ ...refund, returnId: undefined, amountMinor: 1501, externalId: "RETURN-2" }),
			{ status: 400 },
		);
		assert.equal(
			(await updatePayment({ number: "WEB-SPLIT", status: "refunded" })).paymentStatus,
			"refunded",
		);
		assert.equal(await refundedAmount(split.id), 3000);

		const current = await findOrder(split.id);
		assert.ok(current);
		await saveOrder(
			{
				id: split.id,
				status: current.order.status,
				version: current.order.updatedAt.toISOString(),
				trackingNumber: "Updated tracking",
				notes: "Private content should stay out of the audit log",
			},
			"stock-operator",
		);
		const { listAudit } = await import("../src/features/audit/audit.server");
		const updates = await listAudit({ page: 1, q: "tracking number" });
		const logged = updates.rows.find(
			(row) => row.actor === "Operator" && row.fields.includes("notes"),
		);
		assert.ok(logged);
		assert.equal(logged.recordLabel, "WEB-SPLIT");
		assert.deepEqual(logged.fields, ["notes", "tracking_number"]);
		assert.ok(!JSON.stringify(updates).includes("Private content"));
		const payments = await listAudit({ page: 1, q: "payment_events" });
		assert.ok(payments.rows.some(({ recordLabel }) => recordLabel === "WEB-SPLIT"));

		const { findOrderDocuments, startBatchFulfillment } = await import(
			"../src/features/orders/order-detail.server"
		);
		const batch = await Promise.all([
			importOrder({ ...input, number: "WEB-BATCH-1" }),
			importOrder({ ...input, number: "WEB-BATCH-2" }),
		]);
		const ids = batch.map(({ id }) => id);
		await assert.rejects(
			startBatchFulfillment([ids[0], split.id], "stock-operator"),
			/Choose pending orders/,
		);
		assert.equal((await findOrder(ids[0]))?.order.status, "pending");
		await startBatchFulfillment(ids, "stock-operator");
		const documents = await findOrderDocuments([...ids].reverse());
		assert.deepEqual(
			documents.map(({ order }) => order.number),
			["WEB-BATCH-2", "WEB-BATCH-1"],
		);
		assert.ok(
			documents.every(({ order, items }) => order.status === "processing" && items.length === 1),
		);
		const {
			claimNotification,
			acknowledgeNotification,
			listOrderNotifications,
			retryOrderNotification,
		} = await import("../src/features/orders/notifications.server");
		const cancellation = documents[0].order;
		await saveOrder(
			{
				id: cancellation.id,
				status: "cancelled",
				version: cancellation.updatedAt.toISOString(),
				trackingNumber: "",
				notes: "",
			},
			"stock-operator",
		);
		const jobs = await listOrderNotifications(split.id);
		assert.equal(jobs.filter(({ kind }) => kind === "shipping").length, 2);
		assert.equal(jobs.filter(({ kind }) => kind === "refund").length, 2);
		assert.equal((await listOrderNotifications(cancellation.id))[0].kind, "cancellation");
		const [claim, otherClaim] = await Promise.all([claimNotification(), claimNotification()]);
		assert.ok(claim && otherClaim && claim.id !== otherClaim.id);
		assert.equal(await acknowledgeNotification(claim.id, crypto.randomUUID(), "sent"), false);
		assert.equal(await acknowledgeNotification(claim.id, claim.claimId, "failed"), true);
		assert.equal(await acknowledgeNotification(claim.id, claim.claimId, "failed"), true);
		await retryOrderNotification(claim.id);
		const retried = await claimNotification();
		assert.equal(retried?.id, claim.id);
		assert.notEqual(retried?.claimId, claim.claimId);
		assert.ok(retried);
		assert.equal(await acknowledgeNotification(retried.id, retried.claimId, "sent"), true);
		await assert.rejects(retryOrderNotification(retried.id), /Only failed/);

		await importOrder({
			...input,
			number: "WEB-REPORT",
			createdAt: new Date("2025-02-01T02:00:00Z"),
			paidAt: new Date("2025-02-02T02:00:00Z"),
		});
		await updatePayment({
			number: "WEB-REPORT",
			status: "refunded",
			refundedAt: new Date("2025-02-10T02:00:00Z"),
		});
		const { getAnalytics } = await import("../src/features/overview/analytics.server");
		const { metrics } = await getAnalytics(7, "UTC", new Date("2025-02-13T12:00:00Z"));
		assert.deepEqual(metrics.sales, { previous: 1500, current: 0 });
		assert.deepEqual(metrics.paidOrders, { previous: 1, current: 0 });
		assert.deepEqual(metrics.average, { previous: 1500, current: 0 });
		assert.deepEqual(metrics.refunds, { previous: 0, current: 1500 });
		assert.deepEqual(metrics.net, { previous: 1500, current: -1500 });

		const { orderWorkCounts } = await import("../src/features/orders/orders.server");
		const work = await orderWorkCounts();
		assert.equal(
			work.fulfillment,
			(await listOrders({ page: 1, q: "", view: "to_fulfill" })).total,
		);
		assert.equal(
			work.overdue,
			(await listOrders({ page: 1, q: "", view: "overdue_unpaid" })).total,
		);
		assert.equal(
			work.tracking,
			(await listOrders({ page: 1, q: "", shipping: "missing_tracking" })).total,
		);
		assert.equal(work.returns, (await listOrders({ page: 1, q: "", view: "open_returns" })).total);
		assert.ok(work.overdue > 0);

		const { countOrderSyncFailures, listOrderSyncFailures, trackOrderSync } = await import(
			"../src/features/store-integration/order-sync.server"
		);
		const { IntegrationError } = await import(
			"../src/features/store-integration/integration-request.server"
		);
		await assert.rejects(
			trackOrderSync("WEB-REPORT", "payment", async () => {
				throw new IntegrationError(409, "Test conflict");
			}),
			{ status: 409 },
		);
		assert.equal(await countOrderSyncFailures(), 1);
		const failures = await listOrderSyncFailures(1);
		assert.equal(failures.total, 1);
		assert.equal(failures.rows[0].status, 409);
		assert.ok(failures.rows[0].orderId);
		await trackOrderSync("WEB-REPORT", "payment", async () => new Response(null, { status: 200 }));
		assert.equal(await countOrderSyncFailures(), 0);

		await connection`
			insert into commerce_admin.products (name, slug, sku, status, price_minor, stock, reserved_stock, incoming_stock, damaged_stock)
			values ('Counted test item', 'counted-test-item', 'COUNTED-TEST', 'active', 3000, 10, 7, 8, 1)
		`;
		const { listProducts } = await import("../src/features/catalog/products.server");
		const available = await listProducts(
			{ page: 1, q: "COUNTED-TEST", status: "active" },
			"at_or_below",
		);
		assert.equal(available.total, 1);
		assert.equal(available.rows[0].stock, 10);
		assert.equal(available.rows[0].availableStock, 2);
		await assert.rejects(
			connection`update commerce_admin.products set damaged_stock = 4 where sku = 'COUNTED-TEST'`,
			{ code: "23514" },
		);
		const { adjustStockManually } = await import("../src/features/inventory/inventory.server");
		const count = {
			id: crypto.randomUUID(),
			productId: available.rows[0].id,
			kind: "stocktake",
			quantity: 9,
			base: "10:7:8:1",
			reason: "Cycle count",
			reference: "COUNT-1",
			staffId: "stock-operator",
		} as const;
		await Promise.all([adjustStockManually(count), adjustStockManually(count)]);
		await assert.rejects(
			adjustStockManually({ ...count, id: crypto.randomUUID(), quantity: 8 }),
			/Stock changed/,
		);
		await adjustStockManually({
			...count,
			id: crypto.randomUUID(),
			kind: "receiving",
			quantity: 3,
			base: "9:7:8:1",
		});
		const [levels] =
			await connection`select stock, incoming_stock from commerce_admin.products where id = ${count.productId}`;
		assert.equal(levels.stock, 12);
		assert.equal(levels.incoming_stock, 5);

		await connection`
			insert into commerce_admin.products (name, slug, sku, status, price_minor, stock)
			values ('Reserve desk', 'reserve-desk', 'RESERVE-DESK', 'active', 3000, 5),
			       ('Reserve chair', 'reserve-chair', 'RESERVE-CHAIR', 'active', 2000, 2)
		`;
		const { stockMovementSchema } = await import(
			"../src/features/store-integration/integration-validation"
		);
		const { applyStockMovement } = await import(
			"../src/features/store-integration/inventory.server"
		);
		const reservation = stockMovementSchema.parse({
			id: crypto.randomUUID(),
			number: "CHECKOUT-1",
			operation: "reserve",
			lines: [
				{ sku: "reserve-desk", quantity: 4 },
				{ sku: "reserve-chair", quantity: 2 },
			],
		});
		const reserved = await Promise.all([
			applyStockMovement(reservation),
			applyStockMovement({ ...reservation, lines: [...reservation.lines].reverse() }),
		]);
		assert.equal(reserved.filter(Boolean).length, 1);
		await assert.rejects(applyStockMovement({ ...reservation, number: "CHECKOUT-2" }), {
			status: 409,
		});
		await assert.rejects(
			applyStockMovement({
				...reservation,
				id: crypto.randomUUID(),
				number: "CHECKOUT-2",
				operation: "release",
			}),
			{ status: 409 },
		);
		await assert.rejects(
			applyStockMovement({
				...reservation,
				id: crypto.randomUUID(),
				number: "CHECKOUT-2",
				lines: [
					{ sku: "RESERVE-DESK", quantity: 1 },
					{ sku: "RESERVE-CHAIR", quantity: 1 },
				],
			}),
			{ status: 409 },
		);
		await applyStockMovement({
			...reservation,
			id: crypto.randomUUID(),
			operation: "fulfill",
			lines: [{ sku: "RESERVE-DESK", quantity: 3 }],
		});
		await applyStockMovement({
			...reservation,
			id: crypto.randomUUID(),
			operation: "release",
			lines: [{ sku: "RESERVE-DESK", quantity: 1 }],
		});
		const [remainingDesk] =
			await connection`select stock, reserved_stock from commerce_admin.products where sku = 'RESERVE-DESK'`;
		assert.equal(remainingDesk.stock, 2);
		assert.equal(remainingDesk.reserved_stock, 0);
		const [pendingChair] =
			await connection`select stock, reserved_stock from commerce_admin.products where sku = 'RESERVE-CHAIR'`;
		assert.equal(pendingChair.stock, 2);
		assert.equal(pendingChair.reserved_stock, 2);

		const { acknowledgeReplenishment, readReplenishmentAlerts } = await import(
			"../src/features/inventory/replenishment.server"
		);
		const beforeAck = (await readReplenishmentAlerts(1, true)).rows.find(
			({ sku }) => sku === "RESERVE-DESK",
		);
		assert.ok(beforeAck);
		await acknowledgeReplenishment(beforeAck.id, "stock-operator");
		assert.ok(!(await readReplenishmentAlerts(1, true)).rows.some(({ id }) => id === beforeAck.id));
		assert.ok(
			(await readReplenishmentAlerts(1)).rows.find(({ id }) => id === beforeAck.id)?.acknowledgedAt,
		);
		await connection`update commerce_admin.products set stock = 10 where sku = 'RESERVE-DESK'`;
		assert.ok(!(await readReplenishmentAlerts(1)).rows.some(({ sku }) => sku === "RESERVE-DESK"));
		await connection`update commerce_admin.products set stock = 1 where sku = 'RESERVE-DESK'`;
		const reopened = (await readReplenishmentAlerts(1, true)).rows.find(
			({ sku }) => sku === "RESERVE-DESK",
		);
		assert.ok(reopened);
		assert.notEqual(reopened.id, beforeAck.id);

		await connection`insert into commerce_admin.customers (name, email, phone) values ('Phone search', 'phone-search@example.test', '+977 (984) 123-4567')`;
		const { listCustomers } = await import("../src/features/customers/customers.server");
		assert.equal((await listCustomers({ page: 1, q: "9841234567" })).total, 1);
		assert.equal(
			(await listCustomers({ page: 1, q: "(984) 123-4567" })).rows[0].name,
			"Phone search",
		);
		const { customerOrderSummary } = await import("../src/features/customers/customers.server");
		const [reportCustomer] =
			await connection`select customer_id from commerce_admin.orders where number = 'WEB-REPORT'`;
		const summary = await customerOrderSummary(reportCustomer.customer_id);
		assert.ok(summary.count > 0);
		assert.ok(summary.openCount > 0);
		assert.equal(summary.first.toISOString(), "2025-02-01T02:00:00.000Z");
		assert.ok(summary.outstanding.some(({ number }) => number.startsWith("WEB-")));
		const [noOrders] =
			await connection`select id from commerce_admin.customers where email = 'phone-search@example.test'`;
		const emptySummary = await customerOrderSummary(noOrders.id);
		assert.equal(emptySummary.count, 0);
		assert.equal(emptySummary.first, null);
		assert.equal(emptySummary.average, null);

		const primary = {
			name: "Primary account",
			email: "primary-identity@example.test",
			phone: "",
			externalId: "store-account-1",
		};
		const duplicate = {
			name: "Duplicate account",
			email: "duplicate-identity@example.test",
			phone: "",
			externalId: "store-account-2",
		};
		const firstOrder = await importOrder({ ...input, number: "IDENTITY-1", customer: primary });
		const nextOrder = await importOrder({
			...input,
			number: "IDENTITY-2",
			customer: { ...primary, email: "new-buyer-email@example.test" },
		});
		await assert.rejects(
			importOrder({
				...input,
				number: "IDENTITY-CONFLICT",
				customer: { ...primary, externalId: "different-account" },
			}),
			{ status: 409 },
		);
		const duplicateOrder = await importOrder({
			...input,
			number: "IDENTITY-3",
			customer: duplicate,
		});
		const ordersByIdentity =
			await connection`select id, customer_id, buyer_email from commerce_admin.orders where id in (${firstOrder.id}, ${nextOrder.id}, ${duplicateOrder.id})`;
		const firstIdentity = ordersByIdentity.find(({ id }) => id === firstOrder.id);
		const nextIdentity = ordersByIdentity.find(({ id }) => id === nextOrder.id);
		const source = ordersByIdentity.find(({ id }) => id === duplicateOrder.id);
		assert.ok(firstIdentity && nextIdentity && source);
		assert.equal(firstIdentity.customer_id, nextIdentity.customer_id);
		assert.equal(nextIdentity.buyer_email, "new-buyer-email@example.test");
		const { mergeDuplicateCustomer } = await import("../src/features/customers/customers.server");
		await mergeDuplicateCustomer(
			{
				id: source.customer_id,
				targetEmail: primary.email,
				version: 0,
				reason: "Matched customer profiles",
				confirm: "on",
			},
			"stock-operator",
		);
		const afterMerge = await importOrder({ ...input, number: "IDENTITY-4", customer: duplicate });
		const relinked =
			await connection`select customer_id from commerce_admin.orders where id in (${duplicateOrder.id}, ${afterMerge.id})`;
		assert.equal(relinked.length, 2);
		assert.ok(relinked.every(({ customer_id }) => customer_id === firstIdentity.customer_id));
		assert.equal((await listCustomers({ page: 1, q: duplicate.email })).total, 0);

		const { anonymizeCustomerData, exportCustomerData } = await import(
			"../src/features/customers/customer-privacy.server"
		);
		const accountId = firstIdentity.customer_id;
		const exported = await exportCustomerData(accountId);
		assert.ok(exported);
		assert.equal(exported.profiles.length, 2);
		assert.equal(exported.identities.length, 2);
		assert.equal(exported.orders.length, 4);
		assert.ok(exported.orders.some(({ buyerEmail }) => buyerEmail === duplicate.email));
		const redact = { id: accountId, version: 0, confirmation: "ANONYMIZE" } as const;
		await assert.rejects(
			anonymizeCustomerData(redact, "stock-operator"),
			/Complete or cancel open orders/,
		);
		await updatePayment({ number: "IDENTITY-1", status: "paid", paidAt });
		await connection`update commerce_admin.orders set status = 'cancelled', shipping_address = 'Private address', notes = 'Private note' where customer_id = ${accountId}`;
		await connection`insert into commerce_admin.order_notifications (order_id, kind, payload) values (${firstOrder.id}, 'shipping', '{"trackingNumber":"PRIVATE-TRACKING"}')`;
		await anonymizeCustomerData(redact, "stock-operator");
		assert.equal(await exportCustomerData(accountId), null);
		assert.equal((await listCustomers({ page: 1, q: primary.email })).total, 0);
		const [preserved] =
			await connection`select count(*)::int as count, sum(total_minor)::int as total, bool_and(buyer_email = '' and shipping_address = '' and notes = '') as removed from commerce_admin.orders where customer_id = ${accountId}`;
		assert.deepEqual({ ...preserved }, { count: 4, total: 6000, removed: true });
		const [suppressed] =
			await connection`select status, payload from commerce_admin.order_notifications where order_id = ${firstOrder.id}`;
		assert.deepEqual({ ...suppressed }, { status: "suppressed", payload: {} });
		await updatePayment({ number: "IDENTITY-1", status: "refunded" });
		assert.equal((await listOrderNotifications(firstOrder.id)).length, 1);

		const { issueIntegrationKey, listIntegrationKeys, revokeIntegrationKey } = await import(
			"../src/features/store-integration/integration-keys.server"
		);
		const { checkIntegrationToken } = await import(
			"../src/features/store-integration/integration-auth.server"
		);
		const oldKey = await issueIntegrationKey("Catalog worker", ["catalog:read"], "stock-operator");
		const replacement = await issueIntegrationKey(
			"Catalog replacement",
			["catalog:read"],
			"stock-operator",
		);
		const storefrontRequest = (token: string) =>
			new Request("http://localhost/api/store/catalog", {
				headers: { authorization: `Bearer ${token}` },
			});
		assert.equal(await checkIntegrationToken(storefrontRequest(oldKey), "catalog:read"), undefined);
		assert.equal(
			(await checkIntegrationToken(storefrontRequest(oldKey), "payments:write"))?.status,
			403,
		);
		assert.equal(
			await checkIntegrationToken(storefrontRequest(replacement), "catalog:read"),
			undefined,
		);
		const oldCredential = (await listIntegrationKeys()).find(
			({ name }) => name === "Catalog worker",
		);
		assert.ok(oldCredential?.lastUsedAt);
		assert.equal(oldCredential.requestCount, 1);
		await connection`update commerce_admin.integration_keys set window_count = 120, window_start = date_trunc('minute', now()) where id = ${oldCredential.id}`;
		assert.equal(
			(await checkIntegrationToken(storefrontRequest(oldKey), "catalog:read"))?.status,
			429,
		);
		await revokeIntegrationKey(oldCredential.id);
		assert.equal(
			(await checkIntegrationToken(storefrontRequest(oldKey), "catalog:read"))?.status,
			401,
		);
		assert.equal(
			await checkIntegrationToken(storefrontRequest(replacement), "catalog:read"),
			undefined,
		);
		const { updateProductsInBulk } = await import("../src/features/catalog/products.server");
		const selected = await connection<
			{ id: string; version: number }[]
		>`select id, version from commerce_admin.products where sku in ('RESERVE-DESK','RESERVE-CHAIR')`;
		assert.equal(selected.length, 2);
		await updateProductsInBulk(
			{ selected, status: "archived", categoryId: "keep" },
			"stock-operator",
		);
		await assert.rejects(
			updateProductsInBulk({ selected, status: "active", categoryId: "" }, "stock-operator"),
			/selected product changed/,
		);
		assert.equal(
			(
				await connection`select id from commerce_admin.products where sku in ('RESERVE-DESK','RESERVE-CHAIR') and status = 'archived'`
			).length,
			2,
		);
		const [published] =
			await connection`insert into commerce_admin.products (name, slug, sku, price_minor, status) values ('Slug fixture', 'original-slug', 'PUBLISHED-SKU', 1000, 'active') returning id`;
		await connection`update commerce_admin.products set slug = 'canonical-slug' where id = ${published.id}`;
		await assert.rejects(
			connection`update commerce_admin.products set sku = 'REPLACEMENT-SKU' where id = ${published.id}`,
			{ code: "23514" },
		);
		await assert.rejects(
			connection`insert into commerce_admin.products (name, slug, sku, price_minor) values ('Different item', 'original-slug', 'OTHER-SKU', 1200)`,
			{ code: "23505" },
		);
		const { handleStoreCatalog } = await import("../src/features/store-integration/catalog.server");
		const aliasResponse = await handleStoreCatalog({
			request: new Request("http://localhost/api/store/catalog?slug=original-slug", {
				headers: { authorization: `Bearer ${replacement}` },
			}),
		});
		assert.equal(aliasResponse.status, 200);
		const alias = await aliasResponse.json();
		assert.equal(alias.canonicalSlug, "canonical-slug");
		assert.equal(alias.redirected, true);
		assert.equal(alias.item.sku, "PUBLISHED-SKU");

		const { saveProduct, listProductVariants } = await import(
			"../src/features/catalog/products.server"
		);
		const variant = {
			id: undefined,
			name: "Fixture · Blue small",
			slug: "fixture-blue-small",
			sku: "FIXTURE-BLUE-S",
			description: "",
			imageUrl: "https://example.test/blue.jpg",
			categoryId: null,
			status: "active",
			price: "25.00",
			lowStockThreshold: 2,
			variantOf: published.id,
			variantOptions: [
				{ name: "Size", value: "Small" },
				{ name: "Color", value: "Blue" },
			],
		} as const;
		await saveProduct(
			{ ...variant, variantOptions: [...variant.variantOptions] },
			"stock-operator",
		);
		const { databaseCode } = await import("../src/server/db-errors.server");
		await assert.rejects(
			saveProduct(
				{
					...variant,
					sku: "FIXTURE-DUPLICATE",
					slug: "fixture-duplicate",
					variantOptions: [
						{ name: "color", value: "BLUE" },
						{ name: "SIZE", value: "small" },
					],
				},
				"stock-operator",
			),
			(error: unknown) => databaseCode(error) === "23505",
		);
		const [savedVariant] = await listProductVariants(published.id);
		await adjustStock({
			id: crypto.randomUUID(),
			productId: savedVariant.id,
			delta: 5,
			reason: "Fixture stock",
			staffId: "stock-operator",
		});
		const stockRequest = {
			id: crypto.randomUUID(),
			number: "WITH-VARIANT",
			operation: "reserve",
			lines: [{ sku: variant.sku, quantity: 2 }],
		} as const;
		await applyStockMovement({ ...stockRequest, lines: [...stockRequest.lines] });
		const request = (slug: string) =>
			new Request(`http://localhost/api/store/catalog?slug=${slug}`, {
				headers: { authorization: `Bearer ${replacement}` },
			});
		const listing = await (await handleStoreCatalog({ request: request("canonical-slug") })).json();
		assert.equal(listing.item.stock, 0);
		assert.equal(listing.item.variants[0].sku, variant.sku);
		assert.equal(listing.item.variants[0].stock, 5);
		assert.equal(listing.item.variants[0].priceMinor, 2500);
		await connection`update commerce_admin.products set status = 'archived' where id = ${published.id}`;
		assert.equal((await handleStoreCatalog({ request: request(variant.slug) })).status, 404);
		await assert.rejects(
			applyStockMovement({
				...stockRequest,
				id: crypto.randomUUID(),
				lines: [...stockRequest.lines],
			}),
			{ status: 409 },
		);
		const { prepareCatalogImport, applyCatalogImport, exportCatalogCsv } = await import(
			"../src/features/catalog/catalog-csv.server"
		);
		const { catalogCsvCell, catalogCsvHeaders } = await import(
			"../src/features/catalog/catalog-csv"
		);
		const header = catalogCsvHeaders.join(",");
		const fixture = [
			"CSV-TEST",
			"CSV sample",
			"csv-sample",
			"13.25",
			"USD",
			"draft",
			"",
			'Contains a comma, a quote " and a\nsecond line.',
			"",
			"5",
			"",
			"",
		];
		const rowCsv = (row: string[]) => `${header}\r\n${row.map(catalogCsvCell).join(",")}\r\n`;
		const text = rowCsv(fixture);
		const review = await prepareCatalogImport(text, "create", "USD");
		assert.deepEqual(review.rows[0].errors, []);
		await applyCatalogImport(text, "create", review.digest, "stock-operator");
		const [csvProduct] =
			await connection`select price_minor, description, stock from commerce_admin.products where sku = 'CSV-TEST'`;
		assert.equal(csvProduct.price_minor, 1325);
		assert.equal(csvProduct.description, fixture[7]);
		assert.equal(csvProduct.stock, 0);
		assert.match(
			(await prepareCatalogImport(text, "create", "USD")).rows[0].errors.join(" "),
			/SKU exists/,
		);
		const updatedCsv = rowCsv(["CSV-TEST", "=Escaped sample", ...fixture.slice(2)]);
		const approved = await prepareCatalogImport(updatedCsv, "upsert", "USD");
		await applyCatalogImport(updatedCsv, "upsert", approved.digest, "stock-operator");
		await assert.rejects(
			applyCatalogImport(updatedCsv, "upsert", approved.digest, "stock-operator"),
			/catalog changed/,
		);
		const exportedCsv = await new Response(await exportCatalogCsv()).text();
		assert.match(exportedCsv, /"CSV-TEST","'=Escaped sample"/);
	} finally {
		await connection.end({ timeout: 1 });
		if (originalUrl === undefined) delete process.env.DATABASE_URL;
		else process.env.DATABASE_URL = originalUrl;
	}
});
