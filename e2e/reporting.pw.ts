import { expect, test } from "@playwright/test";
import { signIn } from "./staff";

test("uses presets on the dashboard and exports custom dates through the API", async ({ page }) => {
	const url = "/api/reports/sales?from=2025-02-01&through=2025-02-02";
	expect((await page.request.get(url)).status()).toBe(401);
	await signIn(page, "/", "VIEWER");
	await expect(page).toHaveURL(/\/dashboard$/);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.getByRole("combobox", { name: "Reporting period" }).click();
	await expect(page.getByRole("option", { name: "Custom dates" })).toHaveCount(0);
	await page.getByRole("option", { name: "Last 7 days" }).click();
	await expect(page.getByRole("link", { name: "Download CSV" })).toHaveAttribute(
		"href",
		"/api/reports/sales?range=7",
	);
	const response = await page.request.get(url);
	expect(response.ok()).toBe(true);
	expect(response.headers()["content-type"]).toContain("text/csv");
	const lines = (await response.text()).trim().split("\r\n");
	expect(lines[0]).toContain("paid_sales_minor,refunds_minor,net_minor");
	expect(lines.slice(1).map((line) => line.split(",").slice(0, 2).join(","))).toEqual([
		"previous,2025-01-30",
		"previous,2025-01-31",
		"current,2025-02-01",
		"current,2025-02-02",
	]);
});

test("opens the dashboard work queues with their filters applied", async ({ page }) => {
	await signIn(page, "/", "VIEWER");
	await page.getByRole("link", { name: /Ready for fulfillment/ }).click();
	await expect(page).toHaveURL(/\/orders\?view=to_fulfill/);
	await page.goto("/");
	await expect(page).toHaveURL(/\/dashboard$/);
	await page.getByRole("link", { name: /Synchronization failures/ }).click();
	await expect(page.getByRole("heading", { name: "Synchronization failures" })).toBeVisible();
});
