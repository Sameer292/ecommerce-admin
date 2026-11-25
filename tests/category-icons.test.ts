import assert from "node:assert/strict";
import { test } from "node:test";
import { categoryIcon } from "../src/db/schema/catalog";
import { categoryIcons, defaultCategoryIcon } from "../src/features/catalog/catalog-options";
import { categoryFormSchema } from "../src/features/catalog/catalog-validation";
import { categoryIconOptions } from "../src/features/catalog/category-icon";

test("every category icon has a glyph and can be saved through the category form", () => {
	assert.equal(new Set(categoryIcons).size, categoryIcons.length);
	assert.deepEqual(Object.keys(categoryIconOptions), [...categoryIcons]);
	assert.deepEqual(categoryIcon.enumValues, categoryIcons);
	for (const icon of categoryIcons) {
		assert.ok(categoryIconOptions[icon].label);
		assert.ok(categoryIconOptions[icon].glyph.length > 0);
		assert.equal(
			categoryFormSchema.parse({
				id: "",
				name: "Category",
				slug: "category",
				description: "",
				icon,
			}).icon,
			icon,
		);
	}
	assert.equal(defaultCategoryIcon, "folder");
	assert.equal(
		categoryFormSchema.safeParse({
			id: "",
			name: "Category",
			slug: "category",
			description: "",
			icon: "not-a-category-icon",
		}).success,
		false,
	);
});
