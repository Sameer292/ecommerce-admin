import assert from "node:assert/strict";
import { test } from "node:test";
import { getRouter } from "../src/router";

test("SSR hydrates the browser cache without a second request and isolates other routers", async () => {
	const server = getRouter();
	const browser = getRouter();
	const other = getRouter();
	const queryKey = ["order", "one"];
	const order = { id: "one", createdAt: new Date("2026-11-25T00:00:00Z") };
	server.options.context.queryClient.setQueryData(queryKey, order);
	const dehydrated = await server.options.dehydrate?.();
	assert.ok(dehydrated);
	await browser.options.hydrate?.(dehydrated);
	let calls = 0;
	const loaded = await browser.options.context.queryClient.query({
		queryKey,
		queryFn: async () => {
			calls++;
			return order;
		},
	});
	assert.deepEqual(loaded, order);
	assert.ok(loaded.createdAt instanceof Date);
	assert.equal(calls, 0);
	assert.equal(other.options.context.queryClient.getQueryData(queryKey), undefined);
	server.options.context.queryClient.clear();
	browser.options.context.queryClient.clear();
	other.options.context.queryClient.clear();
});
