import assert from "node:assert/strict";
import { test } from "node:test";

test("concurrent record edits preserve the first committed change", {
	skip: !process.env.TEST_EDIT_DATABASE_URL,
}, async () => {
	const originalUrl = process.env.DATABASE_URL;
	process.env.DATABASE_URL = process.env.TEST_EDIT_DATABASE_URL;
	const { connection, db } = await import("../src/db/client.server");
	try {
		const existing = await connection`
			select nspname from pg_namespace where nspname in ('commerce_admin', 'auth', 'drizzle')
		`;
		assert.equal(existing.length, 0, "TEST_EDIT_DATABASE_URL must point to an empty database");
		await connection.unsafe("CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY)");
		const { migrate } = await import("drizzle-orm/postgres-js/migrator");
		await migrate(db, { migrationsFolder: "./drizzle" });
		const { lockStoreCurrency } = await import("../src/features/settings/store-currency.server");
		await lockStoreCurrency("USD");
		const [category] = await connection<{ id: string }[]>`
			insert into commerce_admin.categories (name, slug) values ('Category', 'category') returning id
		`;
		const [product] = await connection<{ id: string }[]>`
			insert into commerce_admin.products (name, slug, sku, price_minor)
			values ('Product', 'product', 'PRD', 1500) returning id
		`;
		const [customer] = await connection<{ id: string }[]>`
			insert into commerce_admin.customers (name, email)
			values ('Customer', 'customer@example.test') returning id
		`;
		const [owner] =
			await connection`insert into auth.users (id) values (gen_random_uuid()) returning id`;
		await connection`
			insert into commerce_admin.staff_user (id, auth_user_id, name, email, role)
			values ('owner', ${owner.id}, 'Owner', 'owner@example.test', 'superuser'),
			       ('staff', null, 'Staff', 'staff@example.test', 'manager')
		`;
		const { saveCategory } = await import("../src/features/catalog/categories.server");
		const { saveProduct } = await import("../src/features/catalog/products.server");
		const { saveCustomer } = await import("../src/features/customers/customers.server");
		const { saveStoreSettings } = await import("../src/features/settings/settings.server");
		const { editStaffAccount } = await import("../src/features/team/team.server");
		const edits = {
			category: (value: string) =>
				saveCategory({ ...category, name: value, slug: "category", description: "", version: 0 }),
			product: (value: string) =>
				saveProduct({
					...product,
					name: value,
					slug: "product",
					sku: "PRD",
					description: "",
					imageUrl: "",
					categoryId: null,
					status: "draft",
					price: "15",
					version: 0,
				}),
			customer: (value: string) =>
				saveCustomer({
					...customer,
					name: value,
					email: "customer@example.test",
					phone: "",
					notes: "",
					version: 0,
				}),
			settings: (value: string) =>
				saveStoreSettings({ name: value, contactEmail: "", timeZone: "UTC", version: 0 }),
			staff: (value: string) =>
				editStaffAccount(
					{
						id: "staff",
						role: "manager",
						status: value === "First" ? "disabled" : "active",
						version: 0,
					},
					"owner",
				),
		};
		for (const [recordType, edit] of Object.entries(edits)) {
			const outcomes = await Promise.allSettled([edit("First"), edit("Second")]);
			assert.equal(outcomes.filter(({ status }) => status === "fulfilled").length, 1, recordType);
			const failure = outcomes.find(({ status }) => status === "rejected");
			assert.ok(failure?.status === "rejected", recordType);
			assert.match(String(failure.reason), /changed.+Refresh/, recordType);
		}
	} finally {
		await connection.end({ timeout: 1 });
		if (originalUrl === undefined) delete process.env.DATABASE_URL;
		else process.env.DATABASE_URL = originalUrl;
	}
});
