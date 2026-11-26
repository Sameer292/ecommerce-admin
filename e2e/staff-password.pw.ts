import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const localAddress = (address: string) =>
	["localhost", "127.0.0.1"].includes(new URL(address).hostname);

test("recovery verifies a one-time link before letting staff choose a password", async ({
	page,
}) => {
	const { DATABASE_URL, SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
	test.skip(
		!DATABASE_URL || !SUPABASE_URL || !SUPABASE_SECRET_KEY,
		"Requires disposable local Supabase fixtures.",
	);
	if (
		!DATABASE_URL ||
		!SUPABASE_URL ||
		!SUPABASE_SECRET_KEY ||
		!localAddress(DATABASE_URL) ||
		!localAddress(SUPABASE_URL)
	)
		throw new Error("Use disposable local Supabase fixtures.");
	const { auth } = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
	const database = postgres(DATABASE_URL, { prepare: false });
	const email = `password-${crypto.randomUUID()}@example.test`;
	const oldPassword = crypto.randomUUID();
	const { data: account, error: createError } = await auth.admin.createUser({
		email,
		password: oldPassword,
		email_confirm: true,
	});
	if (createError || !account.user) throw new Error("Couldn’t create the local password fixture.");
	const { id } = account.user;
	try {
		await database`insert into commerce_admin.staff_user (id, auth_user_id, name, email, password_pending) values (${id}, ${id}, 'Recovery test fixture', ${email}, true)`;
		await page.goto("/login");
		await page.locator('input[name="email"]').fill(email);
		await page.locator('input[name="password"]').fill(oldPassword);
		await page.getByRole("button", { name: "Sign in", exact: true }).click();
		await expect(page.getByRole("link", { name: "Request a new password link" })).toBeVisible();
		expect((await page.request.get("/api/reports/sales")).status()).toBe(401);
		const { data, error } = await auth.admin.generateLink({ type: "recovery", email });
		if (error || !data.properties.hashed_token)
			throw new Error("Couldn’t create the local recovery link.");
		const search = new URLSearchParams({
			type: "recovery",
			token_hash: data.properties.hashed_token,
		});
		await page.goto(`/password/confirm?${search}`);
		await expect(page.getByRole("heading", { name: "Confirm password reset" })).toBeVisible();
		await page.getByRole("button", { name: "Continue", exact: true }).click();
		await expect(page.getByRole("heading", { name: "Choose a password" })).toBeVisible();
		expect((await page.request.get("/api/reports/sales")).status()).toBe(401);
		const password = crypto.randomUUID();
		await page.locator('input[name="password"]').fill(password);
		await page.locator('input[name="confirmation"]').fill(password);
		await page.getByRole("button", { name: "Set password" }).click();
		await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
		await page.locator('input[name="email"]').fill(email);
		await page.locator('input[name="password"]').fill(password);
		await page.getByRole("button", { name: "Sign in", exact: true }).click();
		await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
	} finally {
		await database`delete from commerce_admin.staff_user where id = ${id}`;
		await auth.admin.deleteUser(id);
		await database.end({ timeout: 1 });
	}
});
