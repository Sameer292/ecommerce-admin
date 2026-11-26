import { expect, test } from "@playwright/test";
import { signIn } from "./staff";

test("suggests a new slug and keeps a customized slug as the name changes", async ({ page }) => {
	await signIn(page, "/products/new");
	const name = page.locator('input[name="name"]');
	const slug = page.locator('input[name="slug"]');
	await name.fill("Café & Tea Tin");
	await expect(slug).toHaveValue("cafe-tea-tin");
	await slug.fill("special-tea-tin");
	await name.fill("Tea Tin Deluxe");
	await expect(slug).toHaveValue("special-tea-tin");
});

test("copies product content into a draft with a new SKU", async ({ page }) => {
	await signIn(page, "/products?q=Alpine");
	await page.getByRole("link", { name: /Alpine Travel Mug/ }).click();
	await page.getByRole("link", { name: "Duplicate as draft" }).click();
	await expect(page.locator('input[name="name"]')).toHaveValue(/Alpine Travel Mug copy/);
	await expect(page.locator('input[name="sku"]')).toHaveValue("");
	await expect(page.locator('input[name="slug"]')).toHaveValue("alpine-travel-mug-copy");
	await expect(page.locator('select[name="status"]')).toHaveValue("draft");
});
