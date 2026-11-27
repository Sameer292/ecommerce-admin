import { expect, test } from "@playwright/test";
import { signIn } from "./staff";

test("opens an individual packing slip from the Orders list without row selection", async ({
	page,
	context,
}) => {
	await signIn(page, "/orders");
	const orders = page.getByRole("table", { name: "Orders", exact: true });
	await expect(orders.getByRole("checkbox")).toHaveCount(0);
	await orders.getByRole("link", { name: /^#/ }).first().click();
	const opened = context.waitForEvent("page");
	await page.getByRole("link", { name: "Packing slip", exact: true }).click();
	const print = await opened;
	await expect(print.getByRole("heading", { name: "Print packing slips" })).toBeVisible();
	await expect(print.locator("article")).toHaveCount(1);
	await expect(print.getByRole("columnheader", { name: "Unit price" })).toHaveCount(0);
});

test("opens order details from the dashboard without row selection", async ({ page }) => {
	await signIn(page);
	const recentOrders = page.getByRole("region", { name: "Recent orders" });
	await expect(recentOrders.getByRole("checkbox")).toHaveCount(0);
	await recentOrders.getByRole("link", { name: /^#/ }).first().click();
	await expect(page.getByRole("link", { name: "Packing slip", exact: true })).toBeVisible();
});
