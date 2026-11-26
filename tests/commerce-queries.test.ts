import assert from "node:assert/strict";
import { test } from "node:test";
import { and, eq, ilike, or, sql } from "drizzle-orm";

test("commerce queries preserve results and profile large catalogs, orders and customers", {
	skip: !process.env.TEST_QUERY_DATABASE_URL,
	timeout: 120_000,
}, async () => {
	const originalUrl = process.env.DATABASE_URL;
	process.env.DATABASE_URL = process.env.TEST_QUERY_DATABASE_URL;
	const { connection, db } = await import("../src/db/client.server");
	try {
		const existing = await connection`
			select nspname from pg_namespace where nspname in ('commerce_admin', 'auth', 'drizzle')
		`;
		assert.equal(
			existing.length,
			0,
			"TEST_QUERY_DATABASE_URL must point to an empty disposable database",
		);
		await connection.unsafe("CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY)");
		const { migrate } = await import("drizzle-orm/postgres-js/migrator");
		await migrate(db, { migrationsFolder: "./drizzle" });
		await connection.unsafe(`
			INSERT INTO commerce_admin.customers (id, name, email)
			SELECT md5(n::text)::uuid,
			  CASE WHEN n=1 THEN 'Needle 100%_\\ only' ELSE 'Customer '||n END,
			  CASE WHEN n=2 THEN 'needle@example.test' ELSE 'person'||n||'@example.test' END
			FROM generate_series(1,10000) n;
		`);
		// Keep audit-triggered fixture writes within the same query deadline as production.
		for (let start = 1; start <= 100_000; start += 10_000) {
			await connection.unsafe(
				`
			INSERT INTO commerce_admin.orders
			  (id, number, customer_id, status, payment_status, paid_at, subtotal_minor, total_minor, created_at)
			SELECT md5(('order-'||n)::text)::uuid,
			  (CASE WHEN n<=3 THEN 'WEB-needle-' ELSE 'WEB-' END)||lpad(n::text,6,'0'),
			  md5((((n-1)%9998)+1)::text)::uuid,
			  (CASE WHEN n%2=0 THEN 'pending' ELSE 'processing' END)::commerce_admin.order_status,
			  (CASE n%3 WHEN 0 THEN 'paid' WHEN 1 THEN 'pending' ELSE 'refunded' END)::commerce_admin.payment_status,
			  now(), (n%19+1)*100, (n%19+1)*100,
			  '2026-01-01'::timestamptz + n * interval '1 second'
			FROM generate_series($1::int,$2::int) n;
			`,
				[start, start + 9_999],
			);
		}
		await connection.unsafe(`
			UPDATE commerce_admin.orders SET payment_status='paid', subtotal_minor=2000000000, total_minor=2000000000
			WHERE number IN ('WEB-needle-000001', 'WEB-009999');
		`);
		await connection.unsafe("VACUUM ANALYZE commerce_admin.orders");
		await connection.unsafe("VACUUM ANALYZE commerce_admin.customers");
		await connection.unsafe(`
			INSERT INTO commerce_admin.categories (id, name, slug)
			SELECT md5(('category-'||n)::text)::uuid, 'Category '||lpad(n::text,4,'0'), 'category-'||n
			FROM generate_series(1,1000) n;
		`);
		for (let start = 1; start <= 25_000; start += 5_000) {
			await connection.unsafe(
				`
			INSERT INTO commerce_admin.products (name, sku, slug, price_minor, category_id)
			SELECT (CASE WHEN n%2=0 THEN 'Catalog' ELSE 'CATALOG' END)||' item '||lpad(n::text,6,'0'),
				'SCALE-'||lpad(n::text,6,'0'), 'scale-'||n, n,
				md5(('category-'||(((n-1)%1000)+1))::text)::uuid
			FROM generate_series($1::int,$2::int) n;
			`,
				[start, start + 4_999],
			);
		}
		await connection.unsafe("VACUUM ANALYZE commerce_admin.products");
		const { listProducts } = await import("../src/features/catalog/products.server");
		const { categoryOptions } = await import("../src/features/catalog/categories.server");
		const productCases = [
			{
				label: "catalog substring search",
				page: 1,
				q: "ITEM 023333",
				total: 1,
				first: "SCALE-023333",
			},
			{
				label: "lowercase name sort and deep offset",
				page: 1000,
				q: "",
				total: 25000,
				first: "SCALE-019981",
			},
		];
		for (const { label, page, q, total, first } of productCases) {
			const started = performance.now();
			const result = await listProducts({ page, q, sort: "name.asc" });
			assert.equal(result.total, total, label);
			assert.equal(result.rows[0]?.sku, first, label);
			console.log(`${label}: ${(performance.now() - started).toFixed(1)} ms`);
		}
		const started = performance.now();
		const options = await categoryOptions();
		assert.equal(options.length, 1000);
		assert.equal(options[0]?.name, "Category 0001");
		console.log(`load all category options: ${(performance.now() - started).toFixed(1)} ms`);
		const { customers } = await import("../src/db/schema/customers");
		const { orders } = await import("../src/db/schema/orders");
		const { orderBySort } = await import("../src/db/sort.server");
		const { searchPattern } = await import("../src/lib/pagination");
		const { listOrders } = await import("../src/features/orders/orders.server");
		const { listCustomers } = await import("../src/features/customers/customers.server");
		const [customer] = await connection`select md5('2')::uuid as id`;
		const captured: { text: string; parameters: (string | number)[] }[] = [];
		connection.options.debug = (_id, text, parameters) => captured.push({ text, parameters });
		await listOrders({ page: 1, q: "needle" });
		await listCustomers({ page: 1, q: "", sort: "purchases.desc" });
		connection.options.debug = false;
		type Plan = {
			"Node Type": string;
			"Relation Name"?: string;
			"Index Name"?: string;
			"Actual Loops": number;
			"Subplan Name"?: string;
			Plans?: Plan[];
		};
		const nodes = (plan: Plan): Plan[] => [plan, ...(plan.Plans ?? []).flatMap(nodes)];
		for (const query of captured.filter(
			(query) => query.text.includes("union") || query.text.includes("paid_orders_total"),
		)) {
			const [row] = await connection.unsafe<
				{ "QUERY PLAN": { Plan: Plan; "Execution Time": number }[] }[]
			>(`EXPLAIN (ANALYZE, FORMAT JSON) ${query.text}`, query.parameters);
			const plan = nodes(row["QUERY PLAN"][0].Plan);
			if (query.text.includes("union")) {
				assert.ok(
					!plan.some(
						(node) =>
							node["Node Type"] === "Seq Scan" &&
							["orders", "customers"].includes(node["Relation Name"] ?? ""),
					),
					JSON.stringify(
						plan.map((node) => [node["Node Type"], node["Relation Name"], node["Index Name"]]),
					),
				);
				for (const index of [
					"orders_number_search_index",
					"customers_name_search_index",
					"customers_email_search_index",
				]) {
					assert.ok(
						plan.some((node) => node["Index Name"] === index),
						index,
					);
				}
			} else {
				const aggregates = plan.filter((node) => node["Node Type"] === "Aggregate");
				assert.equal(aggregates.length, 1);
				assert.equal(aggregates[0]["Actual Loops"], 1);
				assert.ok(!plan.some((node) => node["Subplan Name"]?.startsWith("SubPlan")));
			}
			console.log(
				`Verified ${query.text.includes("union") ? "indexed order search" : "single spending aggregate"}: ${row["QUERY PLAN"][0]["Execution Time"]} ms`,
			);
		}
		assert.equal(
			captured.filter(
				(query) => query.text.includes("union") || query.text.includes("paid_orders_total"),
			).length,
			3,
		);
		const searches = [
			"NEEDLE",
			"WEB-000042",
			"Customer 432",
			"person6543@",
			"%_\\",
			"%",
			"_",
			"\\",
			"",
			"no-matches-zzzz",
			"x",
		];
		for (const q of searches) {
			for (const customerId of [undefined, customer.id]) {
				const pattern = searchPattern(q);
				const where = and(
					q
						? or(
								ilike(orders.number, pattern),
								ilike(customers.name, pattern),
								ilike(customers.email, pattern),
							)
						: undefined,
					customerId ? eq(orders.customerId, customerId) : undefined,
				);
				const expected = await db
					.select({ id: orders.id })
					.from(orders)
					.innerJoin(customers, eq(orders.customerId, customers.id))
					.where(where)
					.orderBy(...orderBySort({ date: orders.createdAt }, "date.desc", orders.id));
				for (const page of [1, 2]) {
					const actual = await listOrders({ page, q }, customerId);
					assert.equal(actual.total, expected.length, `${q}: count`);
					assert.deepEqual(
						actual.rows.map((row) => row.id),
						expected.slice((page - 1) * 20, page * 20).map((row) => row.id),
						`${q}: page ${page}`,
					);
				}
			}
		}
		const filtered = await listOrders({
			page: 1,
			q: "needle",
			status: "pending",
			sort: "number.asc",
		});
		assert.ok(filtered.rows.length > 0);
		assert.ok(filtered.rows.every((row) => row.status === "pending"));
		assert.equal(new Set(filtered.rows.map((row) => row.id)).size, filtered.rows.length);

		const previousPaidTotal = db
			.select({ total: sql`coalesce(sum(${orders.totalMinor}), 0)` })
			.from(orders)
			.where(and(eq(orders.customerId, customers.id), eq(orders.paymentStatus, "paid")));
		const previousTotal = sql<number>`(${previousPaidTotal})`
			.mapWith(Number)
			.as("total_purchases_minor");
		for (const q of ["", "needle", "100%_\\", "person9999@"]) {
			for (const sort of ["purchases.asc", "purchases.desc"] as const) {
				const pattern = searchPattern(q);
				const where = q
					? or(ilike(customers.name, pattern), ilike(customers.email, pattern))
					: undefined;
				const expected = await db
					.select({ id: customers.id, totalPurchasesMinor: previousTotal })
					.from(customers)
					.where(where)
					.orderBy(...orderBySort({ purchases: previousTotal }, sort, customers.id))
					.limit(20);
				const actual = await listCustomers({ page: 1, q, sort });
				assert.deepEqual(
					actual.rows.map(({ id, totalPurchasesMinor }) => ({ id, totalPurchasesMinor })),
					expected,
				);
				assert.equal(actual.total, await db.$count(customers, where));
			}
		}
		const biggest = await listCustomers({ page: 1, q: "", sort: "purchases.desc" });
		assert.ok(biggest.rows[0].totalPurchasesMinor >= 4_000_000_000);
		const zero = await listCustomers({ page: 1, q: "person9999@" });
		assert.equal(zero.rows[0].totalPurchasesMinor, 0);
	} finally {
		connection.options.debug = false;
		await connection.end({ timeout: 1 });
		if (originalUrl === undefined) delete process.env.DATABASE_URL;
		else process.env.DATABASE_URL = originalUrl;
	}
});
