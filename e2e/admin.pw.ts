import { expect, test } from "@playwright/test";
import { signIn } from "./staff";

const mug = /Alpine Travel Mug/;

test.describe("narrow products list", () => {
	test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

	test("product names and SKUs remain readable at 390 pixels", async ({ page }) => {
		await signIn(page, "/products?q=Alpine");
		const row = page.getByRole("row").filter({ has: page.getByRole("link", { name: mug }) });
		await expect(row).toBeVisible();
		await expect(row).toContainText(/DEMO|DEMO-/i);
		const box = await row.locator("td").first().boundingBox();
		expect(box?.height).toBeLessThan(120);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
	});
});

test("protects a dirty record and restores the filtered list after leaving", async ({ page }) => {
	await signIn(page, "/products?q=Alpine&sort=price.desc&perPage=50");
	await page.getByRole("link", { name: mug }).click();
	const name = page.locator("input[name=name]");
	await name.fill("Unsaved product title");
	const cancel = page.getByRole("link", { name: "Cancel", exact: true });
	const deniedNavigation = page.waitForEvent("dialog").then(async (dialog) => {
		expect(dialog.message()).toMatch(/unsaved changes/i);
		await dialog.dismiss();
	});
	await Promise.all([deniedNavigation, cancel.click()]);
	await expect(name).toHaveValue("Unsaved product title");
	const leave = page.waitForEvent("dialog").then((dialog) => dialog.accept());
	await Promise.all([leave, cancel.click()]);
	await expect(page.getByRole("link", { name: mug })).toBeVisible();
	const search = new URL(page.url()).searchParams;
	expect(search.get("q")).toBe("Alpine");
	expect(search.get("sort")).toBe("price.desc");
	expect(search.get("perPage")).toBe("50");
});

test("viewers see readable details and cannot open Team", async ({ page }) => {
	await signIn(page, "/products?q=Alpine", "VIEWER");
	await page.getByRole("link", { name: mug }).click();
	await expect(page.getByText("Read-only access", { exact: true })).toBeVisible();
	await expect(page.getByRole("button", { name: "Save product" })).toHaveCount(0);
	await page.goto("/team");
	await expect(page.getByRole("heading", { name: "Access denied", exact: true })).toBeVisible();
});

test("category icons can be found and chosen by accessible name", async ({ page }) => {
	await signIn(page, "/categories/new");
	await page.getByRole("button", { name: "Icon, Folder" }).click();
	await page.getByRole("searchbox", { name: "Search icons" }).fill("Gift");
	await page.getByRole("button", { name: "Gift", exact: true }).click();
	await expect(page.getByRole("button", { name: "Icon, Gift" })).toBeVisible();
});
