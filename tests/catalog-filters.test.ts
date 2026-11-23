import assert from "node:assert/strict";
import { test } from "node:test";
import { filterKey } from "../src/components/admin/use-list-form";
import {
	productSearchSchema,
	readProductFilters,
} from "../src/features/catalog/catalog-validation";

const rangeForm = (minimum: string, maximum: string) => {
	const form = new FormData();
	form.append("priceRange", minimum);
	form.append("priceRange", maximum);
	return form;
};

test("combines slider prices in minor units with the other filters", () => {
	const form = rangeForm("0", "7525");
	form.set("q", " bag ");
	form.set("status", "active");
	form.set("category", "e0000001-0000-4000-8000-000000000001");
	assert.deepEqual(readProductFilters(form, 20000), {
		page: 1,
		q: "bag",
		status: "active",
		category: "e0000001-0000-4000-8000-000000000001",
		minPriceMinor: undefined,
		maxPriceMinor: 7525,
	});
});

test("a slider endpoint leaves that bound open and malformed values cannot apply", () => {
	assert.equal(readProductFilters(rangeForm("200", "750"), 750)?.minPriceMinor, 200);
	assert.equal(readProductFilters(rangeForm("200", "750"), 750)?.maxPriceMinor, undefined);
	assert.equal(readProductFilters(rangeForm("0", "0"), 750)?.maxPriceMinor, 0);
	assert.equal(readProductFilters(rangeForm("0", "750.1"), 750), null);
	assert.equal(readProductFilters(rangeForm("0", "751"), 750), null);
	assert.equal(readProductFilters(rangeForm("900", "750"), 900), null);
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
