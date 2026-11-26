import assert from "node:assert/strict";
import { test } from "node:test";
import { loginReturn } from "../src/features/auth/login-return";

test("login returns to a filtered admin page and rejects untrusted destinations", () => {
	assert.equal(
		loginReturn("/orders/abc?sort=date.desc#activity"),
		"/orders/abc?sort=date.desc#activity",
	);
	assert.equal(loginReturn("/?range=30"), "/?range=30");
	for (const url of [
		null,
		"//other.test",
		"https://other.test/orders",
		"/\\other.test",
		"/login",
		"/api/store/orders",
		"/orders/..//other.test",
	]) {
		assert.equal(loginReturn(url), undefined, String(url));
	}
});
