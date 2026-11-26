import { createServerFn } from "@tanstack/react-start";
import {
	enum as ZEnum,
	instanceof as ZInstanceOf,
	object as ZObject,
	string as ZString,
} from "zod";
import { withStaffMutation } from "@/features/auth/session.server";
import { getStoreCurrency } from "@/features/settings/store-currency.server";
import { formDataSchema } from "@/lib/validation";
import { ActionError, mutate } from "@/server/mutation.server";
import { applyCatalogImport, prepareCatalogImport } from "./catalog-csv.server";

const csvForm = ZObject({
	file: ZInstanceOf(File).refine(
		(file) => file.size > 0 && file.size <= 256 * 1024,
		"Choose a CSV file up to 256 KB.",
	),
	mode: ZEnum(["create", "upsert"]),
});

export type CsvPreview = {
	digest: string;
	rows: { row: number; sku: string; name: string; action: string; errors: string[] }[];
};

const readUtf8File = async (file: File) => {
	try {
		return new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
	} catch {
		throw new ActionError("Save the CSV with UTF-8 encoding and try again.", "file");
	}
};

export const previewCatalogCsv = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(async ({ data }) => {
		let preview: CsvPreview | undefined;
		const result = await withStaffMutation("manageCommerce", () =>
			mutate(csvForm, data, async ({ file, mode }) => {
				const plan = await prepareCatalogImport(
					await readUtf8File(file),
					mode,
					await getStoreCurrency(),
				);
				preview = {
					digest: plan.digest,
					rows: plan.rows.map(({ row, sku, name, action, errors }) => ({
						row,
						sku,
						name,
						action,
						errors,
					})),
				};
			}),
		);
		return result.success && preview ? { ...result, preview } : result;
	});

export const importCatalogCsv = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(({ data }) =>
		withStaffMutation("manageCommerce", (staff) =>
			mutate(
				csvForm.extend({ digest: ZString().regex(/^[a-f0-9]{64}$/) }),
				data,
				async ({ file, mode, digest }) => {
					await applyCatalogImport(await readUtf8File(file), mode, digest, staff.id);
				},
				{
					23505: "A SKU, slug, or variant was taken. Preview the file again.",
					23503: "A linked category or parent changed. Preview the file again.",
				},
			),
		),
	);
