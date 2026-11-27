import { expect, test } from "@playwright/test";
import { signIn } from "./staff";

test("opens the low-stock queue without a per-product threshold column", async ({ page }) => {
	await signIn(page);
	await page.getByRole("link", { name: "View active inventory at or below threshold" }).click();
	const filters = new URL(page.url()).searchParams;
	expect(filters.get("stock")).toBe("at_or_below");
	expect(filters.get("status")).toBe("active");
	await expect(page.getByRole("columnheader", { name: "Publication" })).toBeVisible();
	await expect(page.getByRole("columnheader", { name: "Threshold" })).toHaveCount(0);
	await page.getByRole("combobox", { name: "Stock filter" }).click();
	await expect(page.getByRole("option", { name: "Above threshold" })).toBeVisible();
});

test("previews a physical count before it can be recorded", async ({ page }) => {
	await signIn(page, "/inventory?q=Alpine");
	await page.getByRole("link", { name: "Alpine Travel Mug", exact: true }).click();
	await page.getByRole("combobox", { name: "Adjustment type" }).click();
	await page.getByRole("option", { name: "Set counted quantity" }).click();
	await page.getByRole("spinbutton", { name: "Quantity" }).fill("20");
	await expect(page.getByText(/On hand \d+ → 20 units/)).toBeVisible();
});

test("shows full-width search and equal-width filters on mobile Inventory", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await signIn(page, "/inventory");
	await expect(page.getByRole("link", { name: "Replenishment alerts" })).toHaveCount(0);
	const search = await page.getByRole("searchbox", { name: "Search inventory" }).boundingBox();
	const stock = await page.getByRole("combobox", { name: "Stock filter" }).boundingBox();
	const publication = await page.getByRole("combobox", { name: "Publication" }).boundingBox();
	if (!search || !stock || !publication) throw new Error("Inventory filters must be visible");
	expect(stock.y).toBeGreaterThan(search.y);
	expect(publication.y).toBeCloseTo(stock.y);
	expect(stock.width).toBeCloseTo(publication.width);
	expect(stock.x).toBeCloseTo(search.x);
	expect(publication.x + publication.width).toBeCloseTo(search.x + search.width);
});
