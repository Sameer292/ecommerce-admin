import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";
import { signIn } from "./staff";

const totp = (key: string) => {
	const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
	const bytes = [];
	let carry = 0;
	let bits = 0;
	for (const character of key.toUpperCase().replace(/=+$/, "")) {
		carry = (carry << 5) | alphabet.indexOf(character);
		bits += 5;
		if (bits >= 8) {
			bits -= 8;
			bytes.push((carry >> bits) & 255);
		}
	}
	const counter = Buffer.alloc(8);
	counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
	const hash = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
	const offset = hash[hash.length - 1] & 15;
	return String((hash.readUInt32BE(offset) & 0x7fff_ffff) % 1_000_000).padStart(6, "0");
};

test("requires an authenticator before an owner can read admin data", async ({ page }) => {
	test.setTimeout(60_000);
	test.skip(
		!process.env.E2E_OWNER_EMAIL || !process.env.E2E_OWNER_PASSWORD,
		"Requires a fresh local owner fixture.",
	);
	await signIn(page, "/team", "OWNER");
	await expect(page.getByRole("heading", { name: "Verify your sign-in" })).toBeVisible();
	expect((await page.request.get("/api/reports/sales")).status()).toBe(401);
	await page.getByRole("button", { name: "Set up authenticator" }).click();
	const key = await page.getByTestId("totp-setup-key").textContent();
	if (!key) throw new Error("The test owner could not enroll an authenticator.");
	await page.getByLabel("Authenticator code").fill(totp(key));
	await page.getByRole("button", { name: "Verify sign-in" }).click();
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
	await expect(page.getByLabel("Authenticator code")).toBeVisible();
	await expect(page.getByRole("button", { name: "Set up authenticator" })).toHaveCount(0);
	expect((await page.request.get("/api/reports/sales")).status()).toBe(401);
});
