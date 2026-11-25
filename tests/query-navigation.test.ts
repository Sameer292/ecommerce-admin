import assert from "node:assert/strict";
import { test } from "node:test";
// @ts-expect-error shortcut: Bun runs the tests without Bun types; add types if more tests need its API.
import { mock } from "bun:test";
import type { QueryClient } from "@tanstack/react-query";
import { createQueryClient } from "../src/lib/query-client";
import type { readWorkspace } from "../src/features/auth/session.functions";
import { productSearchSchema } from "../src/features/catalog/catalog-validation";
import {
	createMemoryHistory,
	createFileRoute,
	createRootRouteWithContext,
	createRoute,
	createRouter,
} from "@tanstack/react-router";

test("product hover and click share data, while filters, IDs, invalidation and routers stay separate", async () => {
	let calls = 0;
	let block: Promise<void> | undefined;
	let onRequest = () => {};
	const original = { ...(await import("../src/features/catalog/products.functions")) };
	mock.module("../src/features/catalog/products.functions", () => ({
		...original,
		readProducts: async () => {
			const version = ++calls;
			onRequest();
			await block;
			return { version, total: 40 };
		},
		readProduct: async () => ({ version: ++calls }),
	}));
	const { Route: list } = await import("../src/routes/_admin.products.index");
	const { Route: detail } = await import("../src/routes/_admin.products.$productId");
	const { Route: layout } = await import("../src/routes/_admin");
	const originalSession = { ...(await import("../src/features/auth/session.functions")) };
	mock.module("../src/features/auth/session.functions", () => ({
		...originalSession,
		readWorkspace: async (): Promise<Awaited<ReturnType<typeof readWorkspace>>> => ({
			staff: { id: "staff-1", name: "Owner", email: "owner@example.test", role: "superuser" },
			store: { name: "Store", contactEmail: "", timeZone: "UTC", currency: "USD", version: 0 },
		}),
	}));
	const makeRouter = () => {
		const queryClient = createQueryClient();
		const root = createRootRouteWithContext<{ queryClient: QueryClient }>()();
		const home = createRoute({ getParentRoute: () => root, path: "/" });
		const admin = createFileRoute("/_admin")({
			beforeLoad: layout.options.beforeLoad,
			loader: layout.options.loader,
			staleTime: layout.options.staleTime,
		});
		Object.assign(admin.options, {
			getParentRoute: () => root,
			id: "/_admin",
		});
		const products = createFileRoute("/_admin/products/")({
			validateSearch: list.options.validateSearch,
			loaderDeps: list.options.loaderDeps,
			loader: list.options.loader,
		});
		Object.assign(products.options, {
			getParentRoute: () => admin,
			id: "/products/",
			path: "/products",
		});
		const product = createFileRoute("/_admin/products/$productId")({
			loader: detail.options.loader,
		});
		Object.assign(product.options, {
			getParentRoute: () => admin,
			id: "/products/$productId",
			path: "/products/$productId",
		});
		return createRouter({
			routeTree: root.addChildren([home, admin.addChildren([products, product])]),
			context: { queryClient },
			history: createMemoryHistory(),
			origin: "http://localhost",
			isServer: false,
			defaultPreloadStaleTime: 0,
			defaultStaleReloadMode: "blocking",
		});
	};
	try {
		const router = makeRouter();
		await router.load();
		await router.preloadRoute({ to: "/products/" });
		assert.equal(calls, 1);
		await router.navigate({ to: "/products" });
		assert.equal(calls, 1, "click must reuse the completed hover request");
		await router.navigate({ to: "/" });
		await router.navigate({ to: "/products" });
		assert.equal(calls, 1, "returning to a fresh list must reuse its data");
		await router.navigate({ to: "/products", search: { page: 2 } });
		assert.equal(calls, 2);
		await router.navigate({ to: "/products", search: { q: "shirt", sort: "name.desc" } });
		assert.equal(calls, 3);
		await router.navigate({ to: "/products/$productId", params: { productId: "one" } });
		await router.navigate({ to: "/products/$productId", params: { productId: "two" } });
		assert.equal(calls, 5);
		await router.options.context.queryClient.invalidateQueries({ refetchType: "none" });
		await router.navigate({ to: "/products" });
		assert.equal(calls, 6, "a saved change must invalidate the cached list");
		const second = makeRouter();
		await second.load();
		await second.navigate({ to: "/products" });
		assert.equal(calls, 7, "another router must have its own cache");
		const queryClient = router.options.context.queryClient;
		const key = ["products", productSearchSchema.parse({})];
		const cached = queryClient.getQueryData(key);
		assert.ok(cached);
		queryClient.setQueryData(key, cached, { updatedAt: Date.now() - 60_001 });
		await router.navigate({ to: "/" });
		await router.navigate({ to: "/products" });
		assert.equal(calls, 8, "expired data must refresh on navigation");
		let release = () => {};
		block = new Promise<void>((resolve) => {
			release = resolve;
		});
		const started = new Promise<void>((resolve) => {
			onRequest = resolve;
		});
		const hover = router.preloadRoute({ to: "/products/", search: { q: "slow" } });
		await started;
		const click = router.navigate({ to: "/products", search: { q: "slow" } });
		release();
		await Promise.all([hover, click]);
		assert.equal(calls, 9, "click must share an unfinished hover request");
		await router.navigate({
			to: "/products",
			search: { page: 999, q: "shirt", sort: "price.desc" },
		});
		assert.deepEqual(
			{ ...router.state.location.search },
			productSearchSchema.parse({ page: 2, q: "shirt", sort: "price.desc" }),
			"an out-of-range page must redirect through the real loader and retain filters and sorting",
		);
		router.options.context.queryClient.clear();
		second.options.context.queryClient.clear();
	} finally {
		mock.module("../src/features/catalog/products.functions", () => original);
		mock.module("../src/features/auth/session.functions", () => originalSession);
		mock.restore();
	}
});
