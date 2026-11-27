import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DataTable } from "../src/components/admin/data-table";
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

test("the data table renders the full server page in order without selection controls", () => {
	type Row = { id: string; name: string };
	const html = renderToStaticMarkup(
		createElement(DataTable<Row>, {
			label: "Products",
			empty: "No products",
			columns: [{ label: "Name", sort: "name.asc", cell: (row) => row.name }],
			rows: [
				{ id: "1", name: "Zinc" },
				{ id: "2", name: "Apple" },
				...Array.from({ length: 23 }, (_, index) => ({
					id: `extra-${index}`,
					name: `Product ${index}`,
				})),
			],
			sorting: { value: "name.asc", onChange: () => {} },
		}),
	);
	assert.match(html, /aria-sort="ascending"/);
	assert.match(html, />Zinc<.*>Apple</);
	assert.equal((html.match(/<td\b/g) ?? []).length, 25);
	assert.doesNotMatch(html, /role="checkbox"|data-state="selected"/);
});
