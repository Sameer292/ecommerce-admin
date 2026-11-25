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
		const ledger = await connection`select id from commerce_admin.stock_adjustments`;
		assert.equal(ledger.length, 2);
		assert.ok(!ledger.some(({ id }) => id === failedId));

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
		const { findStoreOrderStatus } = await import(
			"../src/features/store-integration/orders.server"
		);
		await connection`update commerce_admin.orders set status = 'shipped', tracking_number = 'TRACK-1' where number = ${input.number}`;
		const status = await findStoreOrderStatus(input.number);
		assert.ok(status);
		assert.deepEqual(Object.keys(status).sort(), [
			"number",
			"paymentStatus",
			"status",
			"trackingNumber",
			"updatedAt",
		]);
		assert.equal(status.status, "shipped");
		assert.equal(status.trackingNumber, "TRACK-1");
		assert.equal(await findStoreOrderStatus("UNKNOWN"), undefined);
		await connection`update commerce_admin.customers set name = 'New Name', phone = '+1 555 0100' where email = ${input.customer.email}`;
		const { findOrder } = await import("../src/features/orders/order-detail.server");
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
	} finally {
		await connection.end({ timeout: 1 });
		if (originalUrl === undefined) delete process.env.DATABASE_URL;
		else process.env.DATABASE_URL = originalUrl;
	}
});
