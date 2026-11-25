import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "node:test";
import axios from "axios";
import { axiosFetch } from "../src/lib/http";

test("Axios preserves server-function JSON, forms, streams, error responses and cancellation", {
	timeout: 5_000,
}, async () => {
	let finishStream = () => {};
	const server = createServer(async (request, response) => {
		if (request.url === "/stream") {
			response.writeHead(200, {
				"content-type": "application/x-ndjson",
				"x-tss-serialized": "true",
			});
			response.write('{"step":1}\n');
			finishStream = () => response.end('{"step":2}\n');
			return;
		}
		if (request.url === "/error") {
			response.writeHead(403, { "content-type": "application/json", "x-tss-raw": "thrown" });
			response.end('{"error":"Forbidden"}');
			return;
		}
		if (request.url === "/empty") {
			response.writeHead(204).end();
			return;
		}
		const chunks: Buffer[] = [];
		for await (const chunk of request) chunks.push(chunk);
		const body = Buffer.concat(chunks).toString();
		const contentType = request.headers["content-type"] ?? "";
		const data = contentType.startsWith("multipart/form-data")
			? Object.fromEntries(
					await new Request("http://localhost", {
						method: "POST",
						headers: { "content-type": contentType },
						body,
					}).formData(),
				)
			: JSON.parse(body);
		response.writeHead(200, { "content-type": "application/json" });
		response.end(JSON.stringify({ data, serverFn: request.headers["x-tsr-serverfn"] }));
	});
	server.listen(0, "127.0.0.1");
	await once(server, "listening");
	const address = server.address();
	assert.ok(address && typeof address !== "string");
	const origin = `http://127.0.0.1:${address.port}`;
	try {
		const json = await axiosFetch(`${origin}/json`, {
			method: "POST",
			headers: { "content-type": "application/json", "x-tsr-serverFn": "true" },
			body: '{"name":"Shirt"}',
		});
		assert.deepEqual(await json.json(), { data: { name: "Shirt" }, serverFn: "true" });
		const form = new FormData();
		form.set("name", "Shirt");
		const saved = await axiosFetch(`${origin}/form`, { method: "POST", body: form });
		assert.deepEqual(await saved.json(), { data: { name: "Shirt" } });
		const forbidden = await axiosFetch(`${origin}/error`);
		assert.equal(forbidden.status, 403);
		assert.equal(forbidden.headers.get("x-tss-raw"), "thrown");
		assert.deepEqual(await forbidden.json(), { error: "Forbidden" });
		const empty = await axiosFetch(`${origin}/empty`);
		assert.equal(empty.status, 204);
		assert.equal(empty.body, null);
		const stream = await axiosFetch(`${origin}/stream`);
		assert.equal(stream.headers.get("x-tss-serialized"), "true");
		const reader = stream.body?.getReader();
		assert.ok(reader);
		assert.equal(new TextDecoder().decode((await reader.read()).value), '{"step":1}\n');
		finishStream();
		assert.equal(new TextDecoder().decode((await reader.read()).value), '{"step":2}\n');
		assert.equal((await reader.read()).done, true);
		const abort = new AbortController();
		abort.abort();
		await assert.rejects(axiosFetch(`${origin}/json`, { signal: abort.signal }), axios.isCancel);
	} finally {
		finishStream();
		server.closeAllConnections();
		await new Promise<void>((resolve, reject) =>
			server.close((error) => (error ? reject(error) : resolve())),
		);
	}
});
