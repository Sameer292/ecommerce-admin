import { expect, test } from "@playwright/test";
import { signIn } from "./staff";

test("prints one packing slip per selected order with no price columns", async ({
	page,
	context,
}) => {
	await signIn(page, "/orders");
	const boxes = page.getByRole("checkbox", { name: /Select order/ });
	await boxes.nth(0).check();
	await boxes.nth(1).check();
	await expect(page.getByText("2 selected", { exact: true })).toBeVisible();
	const opened = context.waitForEvent("page");
	await page.getByRole("link", { name: "Packing slips", exact: true }).click();
	const print = await opened;
	await expect(print.getByRole("heading", { name: "Print packing slips" })).toBeVisible();
	await expect(print.locator("article")).toHaveCount(2);
	await expect(print.getByRole("columnheader", { name: "Unit price" })).toHaveCount(0);
});
