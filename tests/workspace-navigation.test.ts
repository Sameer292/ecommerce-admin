import assert from "node:assert/strict";
import { test } from "node:test";
// @ts-expect-error shortcut: Bun runs the tests without Bun types; add types if more tests need its API.
import { mock } from "bun:test";
import {
	createMemoryHistory,
	createRootRouteWithContext,
	createRoute,
	createRouter,
	redirect,
} from "@tanstack/react-router";
import type { readWorkspace } from "../src/features/auth/session.functions";
import type { QueryClient } from "@tanstack/react-query";
import { createQueryClient } from "../src/lib/query-client";

test("workspace data is reused across navigation and preload, refreshed on invalidation, and isolated per router", async () => {
	let workspaceCalls = 0;
	let pageChecks = 0;
	let authorized = true;
	let workspace: Awaited<ReturnType<typeof readWorkspace>> = {
		staff: { id: "staff-1", name: "Store owner", email: "owner@example.test", role: "superuser" },
		store: {
			name: "Original store",
			contactEmail: "",
			timeZone: "UTC",
			currency: "USD",
			version: 0,
		},
	};
	const originalFunctions = { ...(await import("../src/features/auth/session.functions")) };
	mock.module("../src/features/auth/session.functions", () => ({
		...originalFunctions,
		readWorkspace: async () => {
			workspaceCalls++;
			return authorized ? workspace : null;
		},
	}));
	const { Route } = await import("../src/routes/_admin");
	const makeRouter = () => {
		const root = createRootRouteWithContext<{ queryClient: QueryClient }>()();
		const admin = createRoute({
			getParentRoute: () => root,
			id: "_admin",
			beforeLoad: Route.options.beforeLoad,
			loader: Route.options.loader,
			staleTime: Route.options.staleTime,
		});
		const pages = (["products", "categories", "orders"] as const).map((path) =>
			createRoute({
				getParentRoute: () => admin,
				path,
				loader: ({ location }) => {
					pageChecks++;
					if (!authorized) throw redirect({ to: "/", search: { returnTo: location.href } });
					return path;
				},
			}),
		);
		const login = createRoute({ getParentRoute: () => root, path: "/" });
		return createRouter({
			routeTree: root.addChildren([admin.addChildren(pages), login]),
			context: { queryClient: createQueryClient() },
			history: createMemoryHistory({ initialEntries: ["/products"] }),
			origin: "http://localhost",
			isServer: false,
			defaultPreloadStaleTime: 0,
			defaultStaleReloadMode: "blocking",
		});
	};
	try {
		const router = makeRouter();
		await router.load();
		assert.equal(workspaceCalls, 1);
		assert.equal(pageChecks, 1);
		await router.navigate({ to: "/categories" });
		assert.equal(workspaceCalls, 1);
		assert.equal(pageChecks, 2);
		await router.preloadRoute({ to: "/orders" });
		await router.navigate({ to: "/orders" });
		assert.equal(workspaceCalls, 1);
		assert.ok(pageChecks >= 3);
		workspace = { ...workspace, store: { ...workspace.store, name: "Updated store" } };
		await router.invalidate({ sync: true });
		assert.equal(workspaceCalls, 2);
		assert.equal(
			router.state.matches.find((match) => match.routeId === "/_admin")?.context.store.name,
			"Updated store",
		);
		const second = makeRouter();
		await second.load();
		assert.equal(workspaceCalls, 3);
		const checksBeforeRevocation = pageChecks;
		authorized = false;
		await router.navigate({ to: "/products" });
		assert.equal(workspaceCalls, 3);
		assert.ok(pageChecks > checksBeforeRevocation);
		assert.equal(router.state.location.pathname, "/");
		const unauthenticated = makeRouter();
		await unauthenticated.load();
		assert.equal(workspaceCalls, 4);
		assert.equal(unauthenticated.state.location.pathname, "/");
		assert.equal(
			new URL(unauthenticated.state.location.href, "http://localhost").searchParams.get("returnTo"),
			"/products",
		);
	} finally {
		mock.module("../src/features/auth/session.functions", () => originalFunctions);
		mock.restore();
	}
});

test("sign-in uses the root, preserves deep links, and routes staff by sign-in step", async () => {
	let step = "signin";
	const originalFunctions = { ...(await import("../src/features/auth/session.functions")) };
	mock.module("../src/features/auth/session.functions", () => ({
		...originalFunctions,
		readSignInStep: async () => step,
	}));
	try {
		const { Route: Index } = await import("../src/routes/index");
		const { Route: LegacyLogin } = await import("../src/routes/login");
		const load = async (href: string) => {
			const root = createRootRouteWithContext<{ queryClient: QueryClient }>()();
			const index = createRoute({
				getParentRoute: () => root,
				path: "/",
				validateSearch: Index.options.validateSearch,
				beforeLoad: Index.options.beforeLoad,
			});
			const login = createRoute({
				getParentRoute: () => root,
				path: "login",
				validateSearch: LegacyLogin.options.validateSearch,
				beforeLoad: LegacyLogin.options.beforeLoad,
			});
			const destinations = ["dashboard", "orders", "password/set"].map((path) =>
				createRoute({ getParentRoute: () => root, path }),
			);
			const router = createRouter({
				routeTree: root.addChildren([index, login, ...destinations]),
				context: { queryClient: createQueryClient() },
				history: createMemoryHistory({ initialEntries: [href] }),
				origin: "http://localhost",
				isServer: false,
			});
			await router.load();
			return router.state.location.href;
		};
		assert.equal(await load("/"), "/");
		const orders = "/orders?view=to_fulfill";
		const legacy = `/login?returnTo=${encodeURIComponent(orders)}`;
		const login = new URL(await load(legacy), "http://localhost");
		assert.equal(login.pathname, "/");
		assert.equal(login.searchParams.get("returnTo"), orders);
		step = "ready";
		assert.equal(await load("/"), "/dashboard");
		assert.equal(await load("/?range=7"), "/dashboard?range=7");
		assert.equal(await load(legacy), orders);
		step = "password";
		assert.equal(await load("/"), "/password/set");
	} finally {
		mock.module("../src/features/auth/session.functions", () => originalFunctions);
		mock.restore();
	}
});

test("the top bar displays page titles without section names", async () => {
	const { navigationTitle } = await import("../src/components/admin/navigation");
	assert.equal(navigationTitle("/dashboard"), "Dashboard");
	assert.equal(navigationTitle("/products/id"), "Products");
	assert.equal(navigationTitle("/categories/"), "Categories");
	assert.equal(navigationTitle("/settings"), "Settings");
	assert.equal(navigationTitle("/product-import"), "Catalog CSV");
});
