import { expect, test } from "@playwright/test";
import { signIn } from "./staff";

test("exports the applied custom sales range to signed-in staff", async ({ page }) => {
	const url = "/api/reports/sales?from=2025-02-01&through=2025-02-02";
	expect((await page.request.get(url)).status()).toBe(401);
	await signIn(page, "/", "VIEWER");
	await page.getByRole("combobox", { name: "Reporting period" }).selectOption("custom");
	await page.getByLabel("Start date").fill("2025-02-01");
	await page.getByLabel("End date").fill("2025-02-02");
	await page.getByRole("button", { name: "Apply", exact: true }).click();
	await expect(page.getByRole("link", { name: "Download CSV" })).toHaveAttribute("href", url);
	await expect(page.getByText("Feb 1, 2025–Feb 2, 2025", { exact: false })).toBeVisible();
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
