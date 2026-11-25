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
	} finally {
		await connection.end({ timeout: 1 });
		if (originalUrl === undefined) delete process.env.DATABASE_URL;
		else process.env.DATABASE_URL = originalUrl;
	}
});
