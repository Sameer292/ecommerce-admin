import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AdminForm } from "@/components/admin/admin-form";
import { SelectField } from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import { NativeSelectOption } from "@/components/ui/native-select";
import { productStatuses, productStatusLabels } from "./catalog-options";
import type { CategoryOption, ProductListRow } from "./catalog.types";
import { writeProductBatch } from "./products.functions";

export const ProductBatch = ({
	selected,
	categories,
	clear,
}: {
	selected: ProductListRow[];
	categories: CategoryOption[];
	clear: () => void;
}) => {
	const router = useRouter();
	const save = useServerFn(writeProductBatch);
	return (
		<section className="rounded-lg border p-4" aria-label="Bulk product edit">
			<p className="mb-3 text-sm font-medium">{selected.length} selected</p>
			<AdminForm
				onSave={(data) => save({ data })}
				onSuccess={async () => {
					clear();
					await router.invalidate();
				}}
				submitLabel="Apply to selected"
				successMessage="Selected products updated."
				cancelAction={
					<Button type="button" variant="outline" onClick={clear}>
						Clear selection
					</Button>
				}
			>
				<input
					type="hidden"
					name="selected"
					value={JSON.stringify(selected.map(({ id, version }) => ({ id, version })))}
				/>
				<div className="grid gap-3 sm:grid-cols-2">
					<SelectField name="status" label="Status" defaultValue="keep">
						<NativeSelectOption value="keep">Keep current status</NativeSelectOption>
						{productStatuses.map((status) => (
							<NativeSelectOption key={status} value={status}>
								{productStatusLabels[status]}
							</NativeSelectOption>
						))}
					</SelectField>
					<SelectField name="categoryId" label="Category" defaultValue="keep">
						<NativeSelectOption value="keep">Keep current category</NativeSelectOption>
						<NativeSelectOption value="">Uncategorized</NativeSelectOption>
						{categories.map(({ id, name }) => (
							<NativeSelectOption key={id} value={id}>
								{name}
							</NativeSelectOption>
						))}
					</SelectField>
				</div>
			</AdminForm>
		</section>
	);
};
