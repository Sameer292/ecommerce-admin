import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AdminForm } from "@/components/admin/admin-form";
import { NotesField, TextField } from "@/components/admin/form-fields";
import { FormSection } from "@/components/admin/form-section";
import type { Category } from "./catalog.types";
import { writeCategory } from "./categories.functions";

const CategoryFields = ({ category }: { category?: Category }) => (
	<FormSection title="Category details">
		<TextField name="name" label="Name" defaultValue={category?.name} maxLength={120} required />
		<TextField
			name="slug"
			label="Slug"
			defaultValue={category?.slug}
			maxLength={100}
			required
			pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
			hint="Lowercase letters, numbers, and hyphens."
		/>
		<NotesField
			name="description"
			label="Description"
			maxLength={1000}
			defaultValue={category?.description}
		/>
	</FormSection>
);

export const CategoryForm = ({
	category,
	editable,
}: {
	category?: Category;
	editable: boolean;
}) => {
	const navigate = useNavigate();
	const save = useServerFn(writeCategory);
	return (
		<div className="max-w-2xl">
			<AdminForm
				onSave={editable ? (data) => save({ data }) : undefined}
				onSuccess={() => navigate({ to: "/categories" })}
				submitLabel={category ? "Save category" : "Create category"}
			>
				<input type="hidden" name="id" value={category?.id ?? ""} />
				<CategoryFields category={category} />
			</AdminForm>
		</div>
	);
};
