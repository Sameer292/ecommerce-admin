import { expect, test } from "@playwright/test";
import { signIn } from "./staff";

test("opens the low-stock queue with publication and threshold visible", async ({ page }) => {
	await signIn(page);
	await page.getByRole("link", { name: "View active inventory at or below threshold" }).click();
	const filters = new URL(page.url()).searchParams;
	expect(filters.get("stock")).toBe("at_or_below");
	expect(filters.get("status")).toBe("active");
	await expect(page.getByRole("columnheader", { name: "Publication" })).toBeVisible();
	await expect(page.getByRole("columnheader", { name: "Threshold" })).toBeVisible();
	await expect(page.getByRole("option", { name: "Above threshold" })).toBeAttached();
});

test("previews a physical count before it can be recorded", async ({ page }) => {
	await signIn(page, "/inventory?q=Alpine");
	await page.getByRole("link", { name: "Alpine Travel Mug", exact: true }).click();
	await page.getByRole("combobox", { name: "Adjustment type" }).selectOption("stocktake");
	await page.getByRole("spinbutton", { name: "Quantity" }).fill("20");
	await expect(page.getByText(/On hand \d+ → 20 units/)).toBeVisible();
});

test("lets a manager acknowledge a replenishment alert", async ({ page }) => {
	await signIn(page, "/inventory");
	await page.getByRole("link", { name: "Replenishment alerts" }).click();
	await expect(page.getByRole("heading", { name: "Replenishment alerts" })).toBeVisible();
	const row = page
		.getByRole("row")
		.filter({ has: page.getByRole("button", { name: "Acknowledge", exact: true }) })
		.first();
	const name = await row.getByRole("link").textContent();
	await row.getByRole("button", { name: "Acknowledge", exact: true }).click();
	await expect(
		page
			.getByRole("row")
			.filter({ has: page.getByRole("link", { name: name ?? "", exact: true }) }),
	).toContainText("Acknowledged");
});
