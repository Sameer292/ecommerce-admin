import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { object as ZObject, string as ZString } from "zod";
import { FieldValidation, TextField } from "../src/components/admin/form-fields";
import { ActionError, mutate } from "../src/server/mutation.server";

test("validation returns errors by field and the form renders an accessible link", async () => {
	const values = new FormData();
	values.set("name", "");
	values.set("price", "");
	const schema = ZObject({
		name: ZString().min(1, "Enter a name."),
		price: ZString().min(1, "Enter a price."),
	});
	const failure = await mutate(schema, values, async () => assert.fail("Saved invalid values"));
	assert.equal(failure.success, false);
	if (failure.success) return;
	assert.deepEqual(failure.fieldErrors, { name: "Enter a name.", price: "Enter a price." });
	const markup = renderToStaticMarkup(
		<FieldValidation value={failure.fieldErrors}>
			<TextField name="name" label="Name" hint="Use the full name." />
		</FieldValidation>,
	);
	assert.match(markup, /aria-invalid="true"/);
	assert.match(markup, /aria-describedby="[^"]+-hint [^"]+-error"/);
	assert.match(markup, /id="[^"]+-error">Enter a name\.<\/div>/);

	values.set("name", "Mug");
	values.set("price", "bad");
	assert.deepEqual(
		await mutate(schema, values, async () => {
			throw new ActionError("Enter a numeric price.", "price");
		}),
		{
			success: false,
			error: "Check the highlighted fields.",
			fieldErrors: { price: "Enter a numeric price." },
		},
	);
});
