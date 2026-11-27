import assert from "node:assert/strict";
import { test } from "node:test";
import { isRedirect } from "@tanstack/react-router";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ListPagination, PageControls } from "../src/components/admin/page-controls";
import { orderDetailSearchSchema } from "../src/features/orders/order-validation";
import {
	clampPage,
	lastPage,
	pageLimit,
	pageOffset,
	pageSearchSchema,
	pageSize,
} from "../src/lib/pagination";
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

test("order details clamp each table independently at its configured page size", () => {
	const search = orderDetailSearchSchema.parse({
		page: 999,
		perPage: 100,
		activity: 999,
		activityPerPage: 50,
		payments: 999,
		paymentsPerPage: 500,
	});
	assert.throws(
		() => redirectInvalidPages("/orders/one", search, 150, 65, 0),
		(error: unknown) => {
			assert.ok(isRedirect(error));
			const url = new URL(error.options.href ?? "", "http://localhost");
			assert.equal(url.searchParams.get("page"), "2");
			assert.equal(url.searchParams.get("perPage"), "100");
			assert.equal(url.searchParams.get("activity"), "2");
			assert.equal(url.searchParams.get("activityPerPage"), "50");
			assert.equal(url.searchParams.get("payments"), "1");
			assert.equal(url.searchParams.has("paymentsPerPage"), false);
			return true;
		},
	);
});

test("larger page sizes reflow counts and preserve the selected size on redirects", () => {
	assert.equal(pageSearchSchema.parse({ perPage: 50 }).perPage, 50);
	assert.equal(pageSearchSchema.parse({ perPage: 500 }).perPage, undefined);
	assert.equal(pageOffset(2, 50), 50);
	assert.equal(clampPage(999, 65, 50), 2);
	assert.throws(
		() => redirectInvalidPages("/products", { page: 999, perPage: 50 }, 65),
		(error: unknown) => {
			assert.ok(isRedirect(error));
			assert.match(error.options.href ?? "", /page=2&perPage=50/);
			return true;
		},
	);
	const html = renderToStaticMarkup(
		createElement(ListPagination, {
			total: 65,
			search: { page: 1, perPage: 50 },
			onSearch: () => {},
		}),
	);
	assert.match(html, /1–50 of 65/);
	assert.match(html, /Last page/);
	assert.match(html, /aria-label="Rows per page"/);
});

test("pagination shows the valid range, page count and direct first-page recovery", () => {
	const html = renderToStaticMarkup(
		createElement(PageControls, { total: 32, page: 2, onPage: () => {}, onSize: () => {} }),
	);
	assert.match(html, /21–32 of 32/);
	assert.match(html, /Page 2 of 2/);
	assert.match(html, /First page/);
	assert.match(html.match(/<button[^>]*aria-label="Next page"[^>]*>/)?.[0] ?? "", /\sdisabled=""/);
	const single = renderToStaticMarkup(
		createElement(PageControls, { total: 3, page: 1, onPage: () => {}, onSize: () => {} }),
	);
	assert.match(single, /20 per page.*Page 1 of 1/);
	assert.equal((single.match(/<button[^>]*\sdisabled=""/g) ?? []).length, 4);
	const empty = renderToStaticMarkup(
		createElement(PageControls, { total: 0, page: 1, onPage: () => {}, onSize: () => {} }),
	);
	assert.match(empty, /No results/);
	assert.match(empty, /sr-only/);
	assert.doesNotMatch(empty, /<button/);
});
