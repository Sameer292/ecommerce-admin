import assert from "node:assert/strict";
import { test } from "node:test";

test("paid retries must match the recorded payment instant", {
	skip: !process.env.TEST_PAYMENT_DATABASE_URL,
}, async () => {
	const originalUrl = process.env.DATABASE_URL;
	process.env.DATABASE_URL = process.env.TEST_PAYMENT_DATABASE_URL;
	const { connection, db } = await import("../src/db/client.server");
	try {
		const existing = await connection`
			select nspname from pg_namespace where nspname in ('commerce_admin', 'auth', 'drizzle')
		`;
		assert.equal(existing.length, 0, "TEST_PAYMENT_DATABASE_URL must point to an empty database");
		await connection.unsafe("CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY)");
		const { migrate } = await import("drizzle-orm/postgres-js/migrator");
		await migrate(db, { migrationsFolder: "./drizzle" });
		const [customer] = await connection`
			insert into commerce_admin.customers (name, email)
			values ('Test Buyer', 'payment@example.test') returning id
		`;
		const [order] = await connection`
			insert into commerce_admin.orders (number, customer_id, subtotal_minor, total_minor, created_at)
			values ('PAY-01', ${customer.id}, 1000, 1000, '2026-01-01T00:00:00Z') returning id
		`;
		const { updatePayment } = await import("../src/features/store-integration/payment.server");
		const failure = {
			number: "PAY-01",
			status: "failed",
			failedAt: new Date("2026-01-01T00:15:00Z"),
			source: "processor",
			method: "card",
			externalId: "failed-attempt-1",
			amountMinor: 1000,
		} as const;
		assert.deepEqual(await updatePayment(failure), { ...order, paymentStatus: "pending" });
		assert.deepEqual(await updatePayment(failure), { ...order, paymentStatus: "pending" });
		await assert.rejects(updatePayment({ ...failure, amountMinor: 1500 }), { status: 409 });
		const paid = {
			number: "PAY-01",
			status: "paid",
			source: "processor",
			method: "card",
			externalId: "paid-attempt-1",
		} as const;
		assert.deepEqual(await updatePayment({ ...paid, paidAt: new Date("2026-01-01T01:00:00Z") }), {
			...order,
			paymentStatus: "paid",
		});
		assert.deepEqual(
			await updatePayment({ ...paid, paidAt: new Date("2026-01-01T06:45:00+05:45") }),
			{ ...order, paymentStatus: "paid" },
		);
		await assert.rejects(updatePayment({ ...paid, paidAt: new Date("2026-01-01T02:00:00Z") }), {
			status: 409,
			message: "Payment timestamp does not match the recorded payment.",
		});
		await assert.rejects(
			updatePayment({ ...paid, paidAt: new Date("2026-01-01T01:00:00Z"), method: "bank transfer" }),
			{ status: 409 },
		);
		const refund = {
			number: paid.number,
			status: "refunded",
			refundedAt: new Date("2026-01-01T03:00:00Z"),
			externalId: "refund-1",
		} as const;
		await updatePayment(refund);
		await updatePayment(refund);
		const { listPaymentEvents } = await import("../src/features/orders/order-detail.server");
		const { rows, total } = await listPaymentEvents(order.id, 1);
		assert.equal(total, 3);
		assert.deepEqual(
			rows.map(({ status }) => status),
			["refunded", "paid", "failed"],
		);
		assert.equal(rows[1].method, "card");
		assert.equal(rows[1].externalId, "paid-attempt-1");
	} finally {
		await connection.end({ timeout: 1 });
		if (originalUrl === undefined) delete process.env.DATABASE_URL;
		else process.env.DATABASE_URL = originalUrl;
	}
});
