import assert from "node:assert/strict";
import { test } from "node:test";
import {
	productSearchSchema,
	readProductFilters,
} from "../src/features/catalog/catalog-validation";

test("combines product filters and preserves inclusive zero and decimal price bounds", () => {
	const form = new FormData();
	form.set("q", " bag ");
	form.set("status", "active");
	form.set("category", "e0000001-0000-4000-8000-000000000001");
	form.set("minPrice", "0");
	form.set("maxPrice", "75.25");
	assert.deepEqual(readProductFilters(form, "USD"), {
		page: 1,
		q: "bag",
		status: "active",
		category: "e0000001-0000-4000-8000-000000000001",
		minPriceMinor: 0,
		maxPriceMinor: 7525,
	});
});

test("an empty price leaves the bound open and invalid amounts cannot apply", () => {
	const form = new FormData();
	form.set("minPrice", "");
	form.set("maxPrice", "750");
	assert.equal(readProductFilters(form, "JPY")?.minPriceMinor, undefined);
	assert.equal(readProductFilters(form, "JPY")?.maxPriceMinor, 750);

	form.set("maxPrice", "0.01");
	assert.equal(readProductFilters(form, "JPY"), null);
	form.set("maxPrice", "21474836.48");
	assert.equal(readProductFilters(form, "USD"), null);
	assert.equal(productSearchSchema.parse({ minPriceMinor: -1 }).minPriceMinor, undefined);
});
