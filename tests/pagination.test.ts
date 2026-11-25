import assert from "node:assert/strict";
import { test } from "node:test";
import { isRedirect } from "@tanstack/react-router";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PageControls } from "../src/components/admin/page-controls";
import { clampPage, lastPage, pageLimit, pageSize } from "../src/lib/pagination";
import { redirectInvalidPages } from "../src/lib/pagination-redirect";

test("page bounds handle empty, exact, partial and maximum result sets", () => {
	assert.equal(lastPage(0), 1);
	assert.equal(lastPage(pageSize), 1);
	assert.equal(lastPage(pageSize + 1), 2);
	assert.equal(clampPage(999, 32), 2);
	assert.equal(clampPage(999, 0), 1);
	assert.equal(clampPage(0, 32), 1);
	assert.equal(clampPage(2, 32), 2);
	assert.equal(lastPage(pageSize * (pageLimit + 1)), pageLimit);
});

test("pagination redirects preserve filters, sorting and detail return context", () => {
	const search = {
		page: 999,
		q: "bag & book",
		status: "active",
		category: "category-id",
		minPriceMinor: 1000,
		maxPriceMinor: 5000,
		sort: "price.desc",
		returnTo: "/products?page=3&q=bag",
	};
	assert.throws(
		() => redirectInvalidPages("/products", search, 32),
		(error: unknown) => {
			assert.ok(isRedirect(error));
			assert.equal(error.options.replace, true);
			const url = new URL(error.options.href ?? "", "http://localhost");
			assert.equal(url.pathname, "/products");
			assert.equal(url.searchParams.get("page"), "2");
			for (const [key, value] of Object.entries(search)) {
				if (key !== "page") assert.equal(url.searchParams.get(key), String(value));
			}
			return true;
		},
	);
	assert.doesNotThrow(() => redirectInvalidPages("/products", { ...search, page: 2 }, 32));
	assert.doesNotThrow(() => redirectInvalidPages("/products", { page: 1 }, 0));
});

test("order item and activity pages recover together, including empty histories", () => {
	assert.throws(
		() => redirectInvalidPages("/orders/one", { page: 999, activity: 999 }, 32, 0),
		(error: unknown) => {
			assert.ok(isRedirect(error));
			const url = new URL(error.options.href ?? "", "http://localhost");
			assert.equal(url.searchParams.get("page"), "2");
			assert.equal(url.searchParams.get("activity"), "1");
			return true;
		},
	);
});

test("pagination shows the valid range, page count and direct first-page recovery", () => {
	const html = renderToStaticMarkup(
		createElement(PageControls, { total: 32, page: 2, onPage: () => {} }),
	);
	assert.match(html, /21–32 of 32/);
	assert.match(html, /Page 2 of 2/);
	assert.match(html, /First page/);
	assert.match(html.match(/<button[^>]*aria-label="Next page"[^>]*>/)?.[0] ?? "", /disabled/);
	const empty = renderToStaticMarkup(
		createElement(PageControls, { total: 0, page: 1, onPage: () => {} }),
	);
	assert.match(empty, /0 results/);
	assert.doesNotMatch(empty, /<button/);
});
