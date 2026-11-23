import assert from "node:assert/strict";
import { test } from "node:test";
import { moneyInput } from "../src/lib/format";
import { parseMoneyInput } from "../src/lib/money";

test("prices convert to exact minor units using the store currency", () => {
	assert.equal(parseMoneyInput("19.95", "USD"), 1995);
	assert.equal(parseMoneyInput("19.9", "USD"), 1990);
	assert.equal(parseMoneyInput("100", "JPY"), 100);
	assert.equal(parseMoneyInput("5.011", "BHD"), 5011);
	assert.equal(moneyInput(5011, "BHD"), "5.011");
});

test("prices reject precision loss, negative values, and database overflow", () => {
	assert.equal(parseMoneyInput("19.955", "USD"), null);
	assert.equal(parseMoneyInput("19.0", "JPY"), null);
	assert.equal(parseMoneyInput("-1", "USD"), null);
	assert.equal(parseMoneyInput("21474836.47", "USD"), 2147483647);
	assert.equal(parseMoneyInput("21474836.48", "USD"), null);
});
