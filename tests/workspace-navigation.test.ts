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
			if (!authorized) throw redirect({ to: "/login" });
			return workspace;
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
				loader: () => {
					pageChecks++;
					if (!authorized) throw redirect({ to: "/login" });
					return path;
				},
			}),
		);
		const login = createRoute({ getParentRoute: () => root, path: "login" });
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
		assert.equal(router.state.location.pathname, "/login");
		const unauthenticated = makeRouter();
		await unauthenticated.load();
		assert.equal(workspaceCalls, 4);
		assert.equal(unauthenticated.state.location.pathname, "/login");
	} finally {
		mock.module("../src/features/auth/session.functions", () => originalFunctions);
		mock.restore();
	}
});
