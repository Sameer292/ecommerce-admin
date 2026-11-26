import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
		await connection.unsafe(`CREATE TABLE auth.mfa_factors (
			id text PRIMARY KEY, user_id uuid NOT NULL, factor_type text NOT NULL
		)`);
		await connection`
			insert into auth.mfa_factors (id, user_id, factor_type) values
				('active-staff', ${first}, 'totp'),
				('disabled-staff', ${second}, 'totp'),
				('unrelated-user', '00000000-0000-0000-0000-000000000003', 'totp'),
				('other-factor', ${first}, 'webauthn')
		`;
		await connection.unsafe(await readFile("drizzle/0035_remove_staff_mfa.sql", "utf8"));
		assert.deepEqual(
			(await connection`select id from auth.mfa_factors order by id`).map(({ id }) => id),
			["other-factor", "unrelated-user"],
		);
		const { editStaffAccount, findStaffAccount, transferOwnership } = await import(
			"../src/features/team/team.server"
		);
		const { findActiveStaff } = await import("../src/features/auth/session.server");
		await assert.rejects(
			editStaffAccount({ id: first, version: 0, role: "superuser", status: "disabled" }, first),
			/At least one active superuser/,
		);
		await assert.rejects(
			editStaffAccount({ id: first, version: 0, role: "manager", status: "active" }, first),
			/At least one active superuser/,
		);
		await assert.rejects(
			editStaffAccount({ id: "manager", version: 0, role: "superuser", status: "active" }, first),
			/This account can’t be changed here/,
		);
		await editStaffAccount({ id: second, version: 0, role: "superuser", status: "active" }, first);

		const [firstEdit, secondEdit] = await Promise.allSettled([
			editStaffAccount({ id: second, version: 1, role: "superuser", status: "disabled" }, first),
			editStaffAccount({ id: first, version: 0, role: "superuser", status: "disabled" }, second),
		]);
		assert.notEqual(firstEdit.status, secondEdit.status);
		const remaining = firstEdit.status === "fulfilled" ? first : second;
		const disabled = remaining === first ? second : first;
		const rejected = firstEdit.status === "rejected" ? firstEdit : secondEdit;
		assert.equal(rejected.status, "rejected");
		assert.match(String(rejected.reason), /no longer has permission/);
		assert.equal((await findActiveStaff(remaining))?.role, "superuser");
		assert.equal(await findActiveStaff(disabled), null);

		const account = await findStaffAccount(disabled);
		assert.ok(account);
		await editStaffAccount(
			{ id: disabled, version: account.version, role: "superuser", status: "active" },
			remaining,
		);
		await editStaffAccount(
			{ id: disabled, version: account.version + 1, role: "viewer", status: "active" },
			remaining,
		);
		assert.equal((await findActiveStaff(disabled))?.role, "viewer");
		assert.equal((await findActiveStaff(remaining))?.role, "superuser");
		await editStaffAccount(
			{
				id: disabled,
				version: account.version + 2,
				role: "viewer",
				status: "active",
				name: "Next owner",
			},
			remaining,
		);
		assert.equal((await findActiveStaff(disabled))?.name, "Next owner");
		await assert.rejects(transferOwnership(disabled, account.version + 2, remaining), /changed/);
		await transferOwnership(disabled, account.version + 3, remaining);
		assert.equal((await findActiveStaff(disabled))?.role, "superuser");
		assert.equal((await findActiveStaff(remaining))?.role, "manager");
	} finally {
		await connection.end({ timeout: 1 });
		if (originalUrl === undefined) delete process.env.DATABASE_URL;
		else process.env.DATABASE_URL = originalUrl;
	}
});
