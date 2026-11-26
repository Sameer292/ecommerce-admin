import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { formDataSchema, idSchema } from "@/lib/validation";
import { requireStaff, withStaffMutation } from "@/features/auth/session.server";
import { mutate } from "@/server/mutation.server";
import { categoryFormSchema, categorySearchSchema } from "./catalog-validation";
import { deleteCategory, findCategory, listCategories, saveCategory } from "./categories.server";

export const readCategories = createServerFn()
	.validator(categorySearchSchema)
	.handler(async ({ data }) => {
		await requireStaff();
		return listCategories(data);
	});

export const readCategory = createServerFn()
	.validator(idSchema)
	.handler(async ({ data }) => {
		await requireStaff();
		const category = await findCategory(data.id);
		if (!category) throw notFound();
		return category;
	});

export const writeCategory = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(({ data }) =>
		withStaffMutation("manageCommerce", () =>
			mutate(categoryFormSchema, data, saveCategory, {
				23505: "A category already uses this slug.",
			}),
		),
	);

export const removeCategory = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(({ data }) =>
		withStaffMutation("manageCommerce", () =>
			mutate(idSchema, data, ({ id }) => deleteCategory(id), {
				23503: "Move its products to another category before deleting this category.",
			}),
		),
	);
