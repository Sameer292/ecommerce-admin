import assert from "node:assert/strict";
import { test } from "node:test";
import {
	logRequestFailure,
	withRequestDiagnostics,
} from "../src/server/request-diagnostics.server";

test("concurrent request logs have independent IDs and omit raw errors and request data", async () => {
	const events: unknown[] = [];
	const log = console.error;
	console.error = (_, data) => events.push(data);
	try {
		const run = (delay: number) =>
			withRequestDiagnostics(
				new Request("http://localhost/orders?email=hidden@example.test", {
					headers: { Authorization: "secret" },
				}),
				async (id) => {
					await new Promise((resolve) => setTimeout(resolve, delay));
					assert.equal(
						logRequestFailure(
							"test query",
							Object.assign(new Error("private data"), { code: "23505" }),
						),
						id,
					);
					return id;
				},
			);
		const [first, second] = await Promise.all([run(10), run(0)]);
		assert.notEqual(first, second);
		assert.deepEqual(events, [
			{ requestId: second, method: "GET", operation: "test query", code: "23505" },
			{ requestId: first, method: "GET", operation: "test query", code: "23505" },
		]);
	} finally {
		console.error = log;
	}
});
