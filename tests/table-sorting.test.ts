import assert from "node:assert/strict";
import { test } from "node:test";
import { filterKey } from "../src/components/admin/use-list-form";
import { productSearchSchema } from "../src/features/catalog/catalog-validation";
import { nextSort } from "../src/lib/sort";

test("sorting toggles the active column and uses the new column's default direction", () => {
	assert.equal(nextSort("name.asc", "name.asc"), "name.desc");
	assert.equal(nextSort("name.desc", "name.asc"), "name.asc");
	assert.equal(nextSort("name.asc", "date.desc"), "date.desc");
	assert.equal(nextSort("name.asc", "price.asc"), "price.asc");
});

test("admin search validates sorting and keeps sort changes independent of filter drafts", () => {
	assert.equal(productSearchSchema.parse({ sort: "price.desc" }).sort, "price.desc");
	assert.equal(productSearchSchema.parse({ sort: "unknown.asc" }).sort, undefined);
	assert.equal(productSearchSchema.parse({ sort: "name.invalid" }).sort, undefined);
	const before = productSearchSchema.parse({ page: 4, q: "bag", sort: "name.asc" });
	const after = productSearchSchema.parse({ q: "bag", sort: "price.desc" });
	assert.equal(filterKey(before), filterKey(after));
});
