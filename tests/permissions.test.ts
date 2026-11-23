import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { can, isRole } from "../src/features/auth/permissions";

describe("staff permissions", () => {
	test("viewers can read but cannot write or manage the team", () => {
		assert.equal(can("viewer", "read"), true);
		assert.equal(can("viewer", "manageCommerce"), false);
		assert.equal(can("viewer", "manageTeam"), false);
		assert.equal(can("viewer", "manageSettings"), false);
	});

	test("commerce permissions are separate from owner privileges", () => {
		assert.equal(can("manager", "manageCommerce"), true);
		assert.equal(can("manager", "manageTeam"), false);
		assert.equal(can("manager", "manageSettings"), false);
		assert.equal(can("superuser", "manageTeam"), true);
		assert.equal(isRole("viewer,superuser"), false);
	});
});
