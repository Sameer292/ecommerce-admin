import { expect, test } from "@playwright/test";
import { catalogCsvHeaders } from "../src/features/catalog/catalog-csv";
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
	await page.getByRole("link", { name: "Alpine Travel Mug", exact: true }).click();
	await page.getByRole("link", { name: "Duplicate as draft" }).click();
	await expect(page.locator('input[name="name"]')).toHaveValue(/Alpine Travel Mug copy/);
	await expect(page.locator('input[name="sku"]')).toHaveValue("");
	await expect(page.locator('input[name="slug"]')).toHaveValue("alpine-travel-mug-copy");
	await expect(page.getByRole("combobox", { name: "Status" })).toHaveText("Draft");
});

test("previews entered product content and warns about missing publication details", async ({
	page,
}) => {
	await signIn(page, "/products/new");
	await page.locator('input[name="name"]').fill("Preview mug");
	await page.locator('input[name="price"]').fill("15.00");
	await page.getByRole("combobox", { name: "Status" }).click();
	await page.getByRole("option", { name: "Active", exact: true }).click();
	await expect(page.getByRole("heading", { name: "Preview mug" })).toBeVisible();
	await expect(page.getByText("$15.00", { exact: true })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Review before publishing" })).toBeVisible();
	await expect(page.getByText("Add a product image.", { exact: true })).toBeVisible();
});

test("uploads and unlinks a product image", async ({ page }) => {
	test.setTimeout(60_000);
	await signIn(page, "/products/new");
	const suffix = crypto.randomUUID().slice(0, 8);
	const name = `Media fixture ${suffix}`;
	const sku = `MEDIA-${suffix}`.toUpperCase();
	await page.locator('input[name="name"]').fill(name);
	await page.locator('input[name="sku"]').fill(sku);
	await page.locator('input[name="price"]').fill("15.00");
	await page.locator('input[name="imageFile"]').setInputFiles({
		name: "pixel.png",
		mimeType: "image/png",
		buffer: Buffer.from(
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD2UAAAAASUVORK5CYII=",
			"base64",
		),
	});
	await expect(page.getByRole("img", { name, exact: true })).toHaveAttribute("src", /^blob:/);
	await page.getByRole("button", { name: "Create product" }).click();
	await expect(page).toHaveURL(/\/products\/?$/);
	await page.goto(`/products?q=${sku}`, { waitUntil: "domcontentloaded" });
	await page.getByRole("link", { name, exact: true }).click();
	const image = page.getByRole("img", { name, exact: true });
	await expect(image).toHaveAttribute(
		"src",
		/\/storage\/v1\/object\/public\/commerce-product-images\//,
	);
	const imageUrl = await image.getAttribute("src");
	if (!imageUrl) throw new Error("Missing public image URL");
	expect((await page.request.get(imageUrl)).status()).toBe(200);
	await page.getByRole("button", { name: "Remove image" }).click();
	await page.getByRole("button", { name: "Save product" }).click();
	await expect(page).toHaveURL(/\/products\?q=/);
	await page.getByRole("link", { name, exact: true }).click();
	await expect(page.getByRole("img", { name, exact: true })).toHaveCount(0);
});

test("adds an independent SKU and option values to a product", async ({ page }) => {
	await signIn(page, "/products?q=Alpine");
	await page.getByRole("link", { name: "Alpine Travel Mug", exact: true }).click();
	await page.getByRole("link", { name: "Add variant" }).click();
	const suffix = crypto.randomUUID().slice(0, 8);
	const sku = `VARIANT-${suffix.toUpperCase()}`;
	await page.locator('textarea[name="variantOptions"]').fill(`Size: Large\nColor: Blue ${suffix}`);
	await page.locator('input[name="sku"]').fill(sku);
	await page.locator('input[name="slug"]').fill(`alpine-travel-mug-variant-${suffix}`);
	await page.getByRole("button", { name: "Create product" }).click();
	await expect(page).toHaveURL(/\/products\/?$/);
	await page.goto("/products?q=Alpine", { waitUntil: "domcontentloaded" });
	await expect(page.getByRole("row").filter({ hasText: sku })).toContainText(
		"Alpine Travel Mug variant",
	);
	await page.getByRole("link", { name: "Alpine Travel Mug", exact: true }).click();
	const variant = page.getByRole("listitem").filter({ hasText: sku });
	await expect(
		variant.getByRole("link", { name: `Size Large · Color Blue ${suffix}` }),
	).toBeVisible();
});

test("previews, imports, and exports a catalog CSV with duplicate feedback", async ({ page }) => {
	await signIn(page, "/products");
	await page.getByRole("link", { name: "Catalog CSV" }).click();
	const suffix = crypto.randomUUID().slice(0, 8);
	const sku = `CSV-${suffix}`.toUpperCase();
	const file = {
		name: "catalog.csv",
		mimeType: "text/csv",
		buffer: Buffer.from(
			`${catalogCsvHeaders.join(",")}\r\n${sku},CSV item ${suffix},csv-item-${suffix},12.50,USD,draft,,,,,\r\n`,
		),
	};
	await page.locator('input[name="file"]').setInputFiles(file);
	await page.getByRole("button", { name: "Preview CSV" }).click();
	await expect(page.getByRole("cell", { name: sku })).toBeVisible();
	await page.getByRole("button", { name: "Import products" }).click();
	await expect(page.getByText("Catalog import complete.")).toBeVisible();
	const download = await page.request.get("/api/catalog/csv");
	expect(download.status()).toBe(200);
	expect(await download.text()).toContain(sku);
	await page.getByRole("button", { name: "Preview CSV" }).click();
	await expect(page.getByText("This SKU exists. Use update mode to edit it.")).toBeVisible();
	await expect(page.getByRole("button", { name: "Import products" })).toHaveCount(0);
});
