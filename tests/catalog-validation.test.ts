import assert from "node:assert/strict";
import { test } from "node:test";
import { categoryFormSchema, productFormSchema } from "../src/features/catalog/catalog-validation";

const product = {
	id: "",
	name: "Trail Mug",
	slug: "trail-mug",
	description: "",
	sku: "MUG-01",
	categoryId: "",
	status: "draft",
	price: "12.50",
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

test("blank names identify the record being edited", () => {
	const values = { ...product, name: "   ", imageUrl: "" };
	assert.equal(
		productFormSchema.safeParse(values).error?.issues[0].message,
		"Enter a product name.",
	);
	assert.equal(
		categoryFormSchema.safeParse(values).error?.issues[0].message,
		"Enter a category name.",
	);
});
