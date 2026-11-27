import { expect, test } from "@playwright/test";
import { signIn } from "./staff";

test("opens contact details and exports a customer record for managers", async ({
	page,
	browser,
	baseURL,
}) => {
	await signIn(page, "/customers");
	await expect(page.getByRole("link", { name: "Add customer", exact: true })).toHaveCount(0);
	await page
		.getByRole("table", { name: "Customers" })
		.locator('a[href^="/customers/"]')
		.first()
		.click();
	await expect(page.getByRole("heading", { name: "Order summary" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Copy email" })).toBeVisible();
	const url = await page.getByRole("link", { name: "Export customer data" }).getAttribute("href");
	expect(url).toBeTruthy();
	if (!url) throw new Error("Missing export URL");
	const response = await page.request.get(url);
	expect(response.status()).toBe(200);
	expect(response.headers()["cache-control"]).toContain("no-store");
	expect((await response.json()).profiles).toHaveLength(1);
	const viewer = await browser.newPage({ baseURL });
	try {
		await signIn(viewer, "/customers", "VIEWER");
		expect((await viewer.request.get(url)).status()).toBe(403);
	} finally {
		await viewer.close();
	}
});
