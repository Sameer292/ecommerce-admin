import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AdminForm } from "@/components/admin/admin-form";
import { DetailHeading } from "@/components/admin/detail-heading";
import { SelectField, TextField } from "@/components/admin/form-fields";
import { FormSection } from "@/components/admin/form-section";
import { buttonVariants } from "@/components/ui/button";
import { NativeSelectOption } from "@/components/ui/native-select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
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
						onChange={() => setReview(undefined)}
					>
						<NativeSelectOption value="create">Create new products only</NativeSelectOption>
						<NativeSelectOption value="upsert">Create or update by SKU</NativeSelectOption>
					</SelectField>
				</AdminForm>
			</FormSection>
			{review && (
				<FormSection title="Import preview">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead scope="col">Row</TableHead>
								<TableHead scope="col">SKU</TableHead>
								<TableHead scope="col">Product</TableHead>
								<TableHead scope="col">Result</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{review.preview.rows.map((row) => (
								<TableRow key={row.row}>
									<TableCell>{row.row}</TableCell>
									<TableCell>{row.sku}</TableCell>
									<TableCell>{row.name}</TableCell>
									<TableCell>
										{row.errors.length ? (
											<ul className="text-destructive">
												{[...new Set(row.errors)].map((error) => (
													<li key={error}>{error}</li>
												))}
											</ul>
										) : (
											row.action
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
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
