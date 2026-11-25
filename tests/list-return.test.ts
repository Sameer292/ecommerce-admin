import assert from "node:assert/strict";
import { test } from "node:test";
import { listReturnHref, listReturnSearchSchema } from "../src/lib/list-return";

test("detail returns preserve list search, filters, sort and pagination for every list", () => {
	for (const path of ["/products", "/categories", "/customers", "/inventory", "/orders", "/team"]) {
		const href = `${path}?q=bag%20%26%20book&page=3&sort=name.desc&status=active&stock=low&category=category-id&minPriceMinor=1000&maxPriceMinor=5000`;
		const search = listReturnSearchSchema.parse({ returnTo: href });
		assert.equal(listReturnHref(search.returnTo, path), href);
		assert.equal(listReturnHref(path, path), path);
	}
});

test("direct details and unrelated or unsafe return destinations use the normal list", () => {
	for (const returnTo of [
		undefined,
		null,
		{},
		"https://example.test/products?page=3",
		"//example.test/products",
		"/products/record?page=3",
		"/products-archive?page=3",
		"/orders?page=3",
		"/products#bad",
		`/products?q=${"a".repeat(2000)}`,
	]) {
		assert.equal(listReturnHref(returnTo, "/products"), "/products");
	}
});
