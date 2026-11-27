import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AdminForm } from "@/components/admin/admin-form";
import { DetailHeading } from "@/components/admin/detail-heading";
import { TextField } from "@/components/admin/form-fields";
import { SelectField } from "@/components/admin/select-field";
import { FormSection } from "@/components/admin/form-section";
import { buttonVariants } from "@/components/ui/button";
import { DataTable } from "@/components/admin/data-table";
import { can } from "@/features/auth/permissions";
import {
	importCatalogCsv,
	previewCatalogCsv,
	type CsvPreview,
} from "@/features/catalog/catalog-csv.functions";

const ProductImport = () => {
	const previewFile = useServerFn(previewCatalogCsv);
	const apply = useServerFn(importCatalogCsv);
	const router = useRouter();
	const [review, setReview] = useState<{ preview: CsvPreview; submitted: FormData }>();
	return (
		<>
			<DetailHeading
				title="Catalog CSV"
				description="Preview and validate product changes before importing."
				back="/products"
				backLabel="Products"
			>
				<a href="/api/catalog/csv" className={buttonVariants({ variant: "outline" })}>
					Export catalog
				</a>
			</DetailHeading>
			<FormSection
				title="Choose a CSV file"
				description="Use the export columns. Import up to 250 rows at a time. Add parent products before importing their variants."
			>
				<AdminForm
					onSave={async (data) => {
						setReview(undefined);
						const result = await previewFile({ data });
						if (result.success && "preview" in result)
							setReview({ preview: result.preview, submitted: data });
						return result;
					}}
					submitLabel="Preview CSV"
				>
					<TextField
						name="file"
						label="CSV file"
						type="file"
						accept=".csv,text/csv"
						required
						onChange={() => setReview(undefined)}
					/>
					<SelectField
						name="mode"
						label="Import mode"
						defaultValue="create"
						onValueChange={() => setReview(undefined)}
						items={[
							{ value: "create", label: "Create new products only" },
							{ value: "upsert", label: "Create or update by SKU" },
						]}
					/>
				</AdminForm>
			</FormSection>
			{review && (
				<FormSection title="Import preview">
					<DataTable
						label="Import preview"
						empty="No rows to preview."
						rows={review.preview.rows.map((row) => ({ ...row, id: String(row.row) }))}
						columns={[
							{ label: "Row", compact: true, className: "tabular-nums", cell: (row) => row.row },
							{ label: "SKU", cell: (row) => row.sku },
							{ label: "Product", cell: (row) => row.name },
							{
								label: "Result",
								cell: (row) =>
									row.errors.length ? (
										<ul className="text-destructive">
											{[...new Set(row.errors)].map((error) => (
												<li key={error}>{error}</li>
											))}
										</ul>
									) : (
										row.action
									),
							},
						]}
					/>
					{review.preview.rows.some(({ errors }) => errors.length) ? (
						<p className="text-sm">Fix the highlighted rows and preview again.</p>
					) : (
						<AdminForm
							onSave={() => {
								review.submitted.set("digest", review.preview.digest);
								return apply({ data: review.submitted });
							}}
							onSuccess={async () => {
								setReview(undefined);
								await router.invalidate();
							}}
							submitLabel="Import products"
							successMessage="Catalog import complete."
						>
							{null}
						</AdminForm>
					)}
				</FormSection>
			)}
		</>
	);
};

export const Route = createFileRoute("/_admin/product-import")({
	beforeLoad: ({ context }) => {
		if (!can(context.staff.role, "manageCommerce")) throw redirect({ to: "/access-denied" });
	},
	component: ProductImport,
});
