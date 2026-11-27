import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { object as ZObject, string as ZString } from "zod";
import {
	FieldValidation,
	ReadOnlyFields,
	SelectField,
	TextField,
} from "../src/components/admin/form-fields";
import { customerFormSchema } from "../src/features/customers/customer-validation";
import { ActionError, mutate } from "../src/server/mutation.server";

test("saving a customer requires an existing record ID and edit version", () => {
	const fields = { name: "Customer", email: "customer@example.test", phone: "", notes: "" };
	const id = "935b1194-bb73-4b09-8d83-29a83274d5ae";
	assert.equal(customerFormSchema.safeParse({ ...fields, id: "", version: "0" }).success, false);
	assert.equal(customerFormSchema.safeParse({ ...fields, id }).success, false);
	assert.equal(customerFormSchema.parse({ ...fields, id, version: "0" }).version, 0);
});

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

test("read-only fields show values and selected labels as text", () => {
	const markup = renderToStaticMarkup(
		<ReadOnlyFields value={true}>
			<TextField name="name" label="Name" defaultValue="Trail Mug" />
			<SelectField name="status" label="Status" defaultValue="draft">
				<option value="draft">Draft label</option>
			</SelectField>
		</ReadOnlyFields>,
	);
	assert.match(markup, /Trail Mug/);
	assert.match(markup, /Draft label/);
	assert.doesNotMatch(markup, /<(input|select)/);
});

test("shared fields visually identify required inputs and retain native validation", () => {
	const markup = renderToStaticMarkup(<TextField name="name" label="Name" required />);
	assert.match(markup, />Required<\/span>/);
	assert.match(markup, /<input[^>]* required=""/);
});
