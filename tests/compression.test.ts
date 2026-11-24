import assert from "node:assert/strict";
import { gunzipSync } from "node:zlib";
import { test } from "node:test";
import { compressHtml } from "../src/server/compression";

const html = "<!doctype html><h1>Store admin</h1>".repeat(100);
const response = () =>
	new Response(html, {
		headers: {
			"Content-Type": "text/html; charset=utf-8",
			"Content-Length": String(Buffer.byteLength(html)),
			"Cache-Control": "private, no-store",
			"Set-Cookie": "session=test; HttpOnly",
			Vary: "Origin",
			ETag: '"original"',
		},
	});
const request = (encoding: string) =>
	new Request("http://localhost/", {
		headers: { "Accept-Encoding": encoding },
	});

test("HTML compression preserves content and headers and removes stale metadata", async () => {
	const result = compressHtml(request("br, gzip"), response());
	assert.equal(result.headers.get("Content-Encoding"), "gzip");
	assert.equal(result.headers.get("Content-Length"), null);
	assert.equal(result.headers.get("ETag"), null);
	assert.equal(result.headers.get("Vary"), "Origin, Accept-Encoding");
	assert.equal(result.headers.get("Cache-Control"), "private, no-store");
	assert.equal(result.headers.get("Set-Cookie"), "session=test; HttpOnly");
	const compressed = Buffer.from(await result.arrayBuffer());
	assert.ok(compressed.length < Buffer.byteLength(html));
	assert.equal(gunzipSync(compressed).toString(), html);
});

test("encoding negotiation honors exclusions, wildcards, and identity preference", async () => {
	for (const encoding of ["", "identity", "br", "gzip;q=0, *;q=1", "gzip;q=0.5, identity;q=1"]) {
		const result = compressHtml(request(encoding), response());
		assert.equal(result.headers.get("Content-Encoding"), null, encoding);
		assert.equal(result.headers.get("Vary"), "Origin, Accept-Encoding");
		assert.equal(await result.text(), html);
	}
	for (const encoding of ["*", "GZIP; q=0.5"]) {
		const result = compressHtml(request(encoding), response());
		assert.equal(result.headers.get("Content-Encoding"), "gzip", encoding);
		assert.equal(gunzipSync(Buffer.from(await result.arrayBuffer())).toString(), html);
	}
});

test("compressed HTML delivers content before the source stream closes", {
	timeout: 2_000,
}, async () => {
	const source = new TransformStream();
	const writer = source.writable.getWriter();
	const result = compressHtml(
		request("gzip"),
		new Response(source.readable, {
			headers: { "Content-Type": "text/html" },
		}),
	);
	assert.ok(result.body);
	const reader = result.body.pipeThrough(new DecompressionStream("gzip")).getReader();
	try {
		await writer.write(new TextEncoder().encode(html));
		const first = await reader.read();
		assert.equal(new TextDecoder().decode(first.value), html);
	} finally {
		await writer.close();
		await reader.cancel();
	}
});

test("HEAD, empty, encoded, partial, non-HTML and no-transform responses pass through", () => {
	const head = response();
	assert.equal(compressHtml(new Request("http://localhost/", { method: "HEAD" }), head), head);
	for (const original of [
		new Response(null, { status: 204 }),
		new Response(html, { status: 206, headers: { "Content-Type": "text/html" } }),
		new Response(html, { headers: { "Content-Type": "text/event-stream" } }),
		new Response(html, { headers: { "Content-Type": "text/html", "Content-Encoding": "br" } }),
		new Response(html, {
			headers: { "Content-Type": "text/html", "Cache-Control": "no-transform" },
		}),
	]) {
		assert.equal(compressHtml(request("gzip"), original), original);
	}
});
