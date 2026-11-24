import assert from "node:assert/strict";
import { test } from "node:test";

test("concurrent queries and a timed-out query leave the database client usable", {
	skip: process.env.TEST_DATABASE !== "1",
	timeout: 30_000,
}, async () => {
	const { connection } = await import("../src/db/client.server");
	try {
		const results = await Promise.all(Array.from({ length: 24 }, () => connection`select 1 as ok`));
		assert.ok(results.every((rows) => rows[0].ok === 1));
		await assert.rejects(connection`select pg_sleep(20)`, { code: "QUERY_TIMEOUT" });
		const [row] = await connection`select 1 as ok`;
		assert.equal(row.ok, 1);
	} finally {
		await connection.end({ timeout: 1 });
	}
});
