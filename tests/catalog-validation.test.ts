import assert from "node:assert/strict";
import { test } from "node:test";
import { productFormSchema } from "../src/features/catalog/catalog-validation";

const product = {
	id: "",
	name: "Trail Mug",
	slug: "trail-mug",
	description: "",
	sku: "MUG-01",
	categoryId: "",
	status: "draft",
	price: "12.50",
	lowStockThreshold: "5",
};

test("product image URLs are optional and require an HTTPS URL", () => {
	for (const imageUrl of ["", "https://example.test/mug.jpg", "HTTPS://example.test/mug.jpg"]) {
		assert.equal(productFormSchema.parse({ ...product, imageUrl }).imageUrl, imageUrl);
	}
	for (const imageUrl of [
		"http://example.test/mug.jpg",
		"https:example.test/mug.jpg",
		"https://",
	]) {
		const result = productFormSchema.safeParse({ ...product, imageUrl });
		assert.equal(result.error?.issues[0].message, "Enter an HTTPS image URL.");
	}
});
