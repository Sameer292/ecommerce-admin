import assert from "node:assert/strict";
import { test } from "node:test";

test("only active superusers can edit access and concurrent revocations leave one active", {
	skip: !process.env.TEST_TEAM_DATABASE_URL,
	timeout: 30_000,
}, async () => {
	const originalUrl = process.env.DATABASE_URL;
	process.env.DATABASE_URL = process.env.TEST_TEAM_DATABASE_URL;
	const { connection, db } = await import("../src/db/client.server");
	try {
		const existing = await connection`
			select nspname from pg_namespace where nspname in ('commerce_admin', 'auth', 'drizzle')
		`;
		assert.equal(existing.length, 0, "TEST_TEAM_DATABASE_URL must point to an empty database");
		await connection.unsafe("CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY)");
		const { migrate } = await import("drizzle-orm/postgres-js/migrator");
		await migrate(db, { migrationsFolder: "./drizzle" });

		const first = "00000000-0000-0000-0000-000000000001";
		const second = "00000000-0000-0000-0000-000000000002";
		await connection`insert into auth.users (id) values (${first}), (${second})`;
		await connection`
			insert into commerce_admin.staff_user (id, auth_user_id, name, email, role, banned)
			values
				(${first}, ${first}, 'First', 'first@example.test', 'superuser', null),
				(${second}, ${second}, 'Second', 'second@example.test', 'superuser', true),
				('unlinked', null, 'Unlinked', 'unlinked@example.test', 'superuser', false),
				('manager', null, 'Manager', 'manager@example.test', 'manager', false)
		`;
		const { editStaffAccount } = await import("../src/features/team/team.server");
		const { findActiveStaff } = await import("../src/features/auth/session.server");
		await assert.rejects(
			editStaffAccount({ id: first, role: "superuser", status: "disabled" }, first),
			/At least one active superuser/,
		);
		await assert.rejects(
			editStaffAccount({ id: first, role: "manager", status: "active" }, first),
			/At least one active superuser/,
		);
		await assert.rejects(
			editStaffAccount({ id: "manager", role: "superuser", status: "active" }, first),
			/This account can’t be changed here/,
		);
		await editStaffAccount({ id: second, role: "superuser", status: "active" }, first);

		const [firstEdit, secondEdit] = await Promise.allSettled([
			editStaffAccount({ id: second, role: "superuser", status: "disabled" }, first),
			editStaffAccount({ id: first, role: "superuser", status: "disabled" }, second),
		]);
		assert.notEqual(firstEdit.status, secondEdit.status);
		const remaining = firstEdit.status === "fulfilled" ? first : second;
		const disabled = remaining === first ? second : first;
		const rejected = firstEdit.status === "rejected" ? firstEdit : secondEdit;
		assert.equal(rejected.status, "rejected");
		assert.match(String(rejected.reason), /no longer has permission/);
		assert.equal((await findActiveStaff(remaining))?.role, "superuser");
		assert.equal(await findActiveStaff(disabled), null);

		await editStaffAccount({ id: disabled, role: "superuser", status: "active" }, remaining);
		await editStaffAccount({ id: disabled, role: "viewer", status: "active" }, remaining);
		assert.equal((await findActiveStaff(disabled))?.role, "viewer");
		assert.equal((await findActiveStaff(remaining))?.role, "superuser");
	} finally {
		await connection.end({ timeout: 1 });
		if (originalUrl === undefined) delete process.env.DATABASE_URL;
		else process.env.DATABASE_URL = originalUrl;
	}
});
