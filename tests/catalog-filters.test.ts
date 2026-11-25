import assert from "node:assert/strict";
import { test } from "node:test";
import { filterKey } from "../src/components/admin/use-list-form";
import {
	productSearchSchema,
	readProductFilters,
} from "../src/features/catalog/catalog-validation";

const rangeForm = (minimum: string, maximum: string) => {
	const form = new FormData();
	form.set("minPrice", minimum);
	form.set("maxPrice", maximum);
	return form;
};

test("converts exact price bounds to minor units and combines them with the other filters", () => {
	const form = rangeForm("", "75.25");
	form.set("q", " bag ");
	form.set("status", "active");
	form.set("category", "e0000001-0000-4000-8000-000000000001");
	assert.deepEqual(readProductFilters(form, "USD"), {
		page: 1,
		q: "bag",
		status: "active",
		category: "e0000001-0000-4000-8000-000000000001",
		minPriceMinor: undefined,
		maxPriceMinor: 7525,
	});
});

test("blank bounds stay open and malformed or reversed prices cannot apply", () => {
	assert.equal(readProductFilters(rangeForm("2.00", ""), "USD")?.minPriceMinor, 200);
	assert.equal(readProductFilters(rangeForm("2.00", ""), "USD")?.maxPriceMinor, undefined);
	assert.equal(readProductFilters(rangeForm("0", "0"), "USD")?.maxPriceMinor, 0);
	assert.equal(readProductFilters(rangeForm("0", "750.001"), "USD"), null);
	assert.equal(readProductFilters(rangeForm("0", "750.1"), "JPY"), null);
	assert.equal(readProductFilters(rangeForm("9", "7.5"), "USD"), null);
});

test("normalizes reversed bounds from existing links", () => {
	const range = productSearchSchema.parse({ minPriceMinor: 8000, maxPriceMinor: 3500 });
	assert.equal(range.minPriceMinor, 3500);
	assert.equal(range.maxPriceMinor, 8000);
	assert.equal(productSearchSchema.parse({ minPriceMinor: -1 }).minPriceMinor, undefined);
});

test("an applied price filter matches its form submission regardless of URL key order", () => {
	const submitted = { page: 1, q: "bag", minPriceMinor: 1000, maxPriceMinor: 3000 };
	const applied = { maxPriceMinor: 3000, page: 2, minPriceMinor: 1000, q: "bag" };
	assert.equal(filterKey(applied), filterKey(submitted));
});
