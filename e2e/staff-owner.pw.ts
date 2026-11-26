import { expect, test } from "@playwright/test";
import { signIn } from "./staff";

test("owners can sign in with only a password and manage scoped integration keys", async ({
	page,
}) => {
	test.setTimeout(60_000);
	test.skip(
		!process.env.E2E_OWNER_EMAIL || !process.env.E2E_OWNER_PASSWORD,
		"Requires a local owner fixture.",
	);
	expect((await page.request.get("/api/reports/sales")).status()).toBe(401);
	await signIn(page, "/team", "OWNER");
	await expect(page).toHaveURL(/\/team\/?$/);
	await expect(page.getByRole("heading", { name: "Team" })).toBeVisible();
	expect((await page.request.get("/api/reports/sales")).status()).toBe(200);
	await page.goto("/integrations", { waitUntil: "domcontentloaded" });
	await page.locator('input[name="name"]').fill("Browser catalog credential");
	await page.getByRole("checkbox", { name: "Read published catalog" }).check();
	await page.getByRole("button", { name: "Issue key" }).click();
	const credential = await page.locator("code").textContent();
	if (!credential) throw new Error("The owner could not issue the test integration credential.");
	const headers = { authorization: `Bearer ${credential}` };
	expect((await page.request.get("/api/store/catalog", { headers })).status()).toBe(200);
	expect((await page.request.get("/api/store/orders?number=unknown", { headers })).status()).toBe(
		403,
	);
	await page
		.getByRole("listitem")
		.filter({ hasText: "Browser catalog credential" })
		.getByRole("button", { name: "Revoke key" })
		.click();
	await expect(page.getByText(/requests · .* · Revoked/)).toBeVisible();
	expect((await page.request.get("/api/store/catalog", { headers })).status()).toBe(401);
	await page.context().clearCookies();
	await signIn(page, "/team", "OWNER");
	await expect(page).toHaveURL(/\/team\/?$/);
	await expect(page.getByRole("heading", { name: "Team" })).toBeVisible();
	expect((await page.request.get("/api/reports/sales")).status()).toBe(200);
});
