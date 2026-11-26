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
