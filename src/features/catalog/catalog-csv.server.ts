import { eq, gt, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { inStaffAudit } from "@/db/audit-actor.server";
import { db } from "@/db/client.server";
import { categories, products, productSlugs } from "@/db/schema/catalog";
import { getStoreCurrency } from "@/features/settings/store-currency.server";
import { sha256 } from "@/features/store-integration/integration-auth.server";
import { moneyInput } from "@/lib/format";
import { parseMoneyInput } from "@/lib/money";
import { ActionError } from "@/server/mutation.server";
import { catalogCsvCell, catalogCsvHeaders, parseCatalogCsv } from "./catalog-csv";
import { productFormSchema } from "./catalog-validation";
import { persistProduct, productVariantKey } from "./products.server";

type ImportMode = "create" | "upsert";
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const prepareCatalogImport = async (
	text: string,
	mode: ImportMode,
	currency: string,
	reader: typeof db | Transaction = db,
) => {
	let source: ReturnType<typeof parseCatalogCsv>;
	try {
		source = parseCatalogCsv(text);
	} catch (error) {
		throw new ActionError(
			error instanceof Error ? error.message : "This CSV could not be read.",
			"file",
		);
	}
	const skuKey = (value: string) => value.trim().toUpperCase();
	const skuNames = [
		...new Set(source.flatMap(({ cells }) => [skuKey(cells.sku), skuKey(cells.parent_sku)])),
	];
	const categorySlugs = [...new Set(source.map(({ cells }) => cells.category_slug.trim()))];
	const slugs = [...new Set(source.map(({ cells }) => cells.slug.trim()))];
	const [records, categoryRows, existingSlugs] = await Promise.all([
		reader
			.select({
				id: products.id,
				sku: products.sku,
				version: products.version,
				variantOf: products.variantOf,
			})
			.from(products)
			.where(inArray(products.sku, skuNames))
			.orderBy(products.id),
		reader
			.select({ id: categories.id, slug: categories.slug })
			.from(categories)
			.where(inArray(categories.slug, categorySlugs))
			.orderBy(categories.id),
		reader
			.select({ id: productSlugs.productId, slug: productSlugs.slug })
			.from(productSlugs)
			.where(inArray(productSlugs.slug, slugs))
			.orderBy(productSlugs.slug),
	]);
	const existing = new Map(records.map((record) => [record.sku, record]));
	const categoryBySlug = new Map(categoryRows.map(({ slug, id }) => [slug, id]));
	const slugOwners = new Map(existingSlugs.map(({ slug, id }) => [slug, id]));
	const parents = [
		...new Set(
			source.flatMap(({ cells }) => {
				const parent = existing.get(skuKey(cells.parent_sku));
				return parent ? [parent.id] : [];
			}),
		),
	];
	const existingVariants = await reader
		.select({ id: products.id, parent: products.variantOf, key: products.variantKey })
		.from(products)
		.where(inArray(products.variantOf, parents))
		.orderBy(products.id);
	const optionOwners = new Map(
		existingVariants.map(({ id, parent, key }) => [`${parent}/${key}`, id]),
	);
	const seenSkus = new Set<string>();
	const seenSlugs = new Set<string>();
	const seenOptions = new Set<string>();
	const rows = source.map(({ row, cells, invalidLength }) => {
		const sku = skuKey(cells.sku);
		const slug = cells.slug.trim();
		const categorySlug = cells.category_slug.trim();
		const parentSku = skuKey(cells.parent_sku);
		const record = existing.get(sku);
		const parent = parentSku ? existing.get(parentSku) : undefined;
		const errors: string[] = [];
		if (invalidLength) errors.push("The number of fields differs from the header.");
		if (cells.currency.trim() !== currency) errors.push(`Currency must be ${currency}.`);
		if (seenSkus.has(sku)) errors.push("This SKU is already present in the file.");
		if (seenSlugs.has(slug)) errors.push("This slug is already present in the file.");
		if (mode === "create" && record) errors.push("This SKU exists. Use update mode to edit it.");
		if (categorySlug && !categoryBySlug.has(categorySlug))
			errors.push("Category slug was not found.");
		if (slugOwners.has(slug) && slugOwners.get(slug) !== record?.id)
			errors.push("This slug belongs to a different product or former URL.");
		if (parentSku && (!parent || parent.variantOf))
			errors.push("Create the parent product first, then import its variants.");
		if (record && (parent?.id ?? null) !== record.variantOf)
			errors.push("Existing products must keep their parent relationship.");
		seenSkus.add(sku);
		seenSlugs.add(slug);
		const input = productFormSchema.safeParse({
			id: record?.id ?? "",
			version: record ? String(record.version) : undefined,
			name: cells.name,
			sku,
			slug,
			price: cells.price,
			status: cells.status.trim(),
			categoryId: categoryBySlug.get(categorySlug) ?? "",
			description: cells.description,
			imageUrl: cells.image_url,
			variantOf: parent?.id,
			variantOptions: cells.variant_options.trim() || undefined,
		});
		if (!input.success)
			errors.push(...input.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`));
		const amount = parseMoneyInput(cells.price.trim(), currency);
		if (amount === null) errors.push(`Enter a valid ${currency} price.`);
		const key = input.success ? productVariantKey(input.data.variantOptions) : undefined;
		if (key && parent) {
			const compound = `${parent.id}/${key}`;
			if (
				seenOptions.has(compound) ||
				(optionOwners.has(compound) && optionOwners.get(compound) !== record?.id)
			)
				errors.push("This set of variant options is already in use.");
			seenOptions.add(compound);
		}
		return {
			row,
			sku,
			name: cells.name,
			action: record ? "Update" : "Create",
			errors,
			values: input.success ? input.data : null,
			amount,
		};
	});
	const digest = sha256(
		JSON.stringify([text, mode, currency, records, categoryRows, existingSlugs, existingVariants]),
	).toString("hex");
	return { digest, rows };
};

export const applyCatalogImport = async (
	text: string,
	mode: ImportMode,
	digest: string,
	staffId: string,
) => {
	const currency = await getStoreCurrency();
	return inStaffAudit(staffId, async (transaction) => {
		const plan = await prepareCatalogImport(text, mode, currency, transaction);
		if (plan.digest !== digest || plan.rows.some(({ errors }) => errors.length))
			throw new ActionError("The file or catalog changed. Preview the CSV again.");
		for (const { values, amount } of plan.rows) {
			if (!values || amount === null)
				throw new ActionError("Preview the CSV again to resolve validation errors.");
			await persistProduct(transaction, values, amount, values.imageUrl ? "" : undefined);
		}
	});
};

export const exportCatalogCsv = async () => {
	const currency = await getStoreCurrency();
	const parent = alias(products, "parent_sku");
	const encoder = new TextEncoder();
	let after: string | undefined;
	return new ReadableStream<Uint8Array>({
		start(controller) {
			controller.enqueue(encoder.encode(`${catalogCsvHeaders.join(",")}\r\n`));
		},
		async pull(controller) {
			const rows = await db
				.select({
					id: products.id,
					sku: products.sku,
					name: products.name,
					slug: products.slug,
					price: products.priceMinor,
					status: products.status,
					category: categories.slug,
					description: products.description,
					url: products.imageUrl,
					parent: parent.sku,
					options: products.variantOptions,
				})
				.from(products)
				.leftJoin(categories, eq(products.categoryId, categories.id))
				.leftJoin(parent, eq(products.variantOf, parent.id))
				.where(after ? gt(products.id, after) : undefined)
				.orderBy(products.id)
				.limit(500);
			if (rows.length) {
				after = rows[rows.length - 1].id;
				const lines = rows.map((row) =>
					[
						row.sku,
						row.name,
						row.slug,
						moneyInput(row.price, currency),
						currency,
						row.status,
						row.category ?? "",
						row.description,
						row.url,
						row.parent ?? "",
						row.options.map(({ name, value }) => `${name}: ${value}`).join("\n"),
					]
						.map(catalogCsvCell)
						.join(","),
				);
				controller.enqueue(encoder.encode(`${lines.join("\r\n")}\r\n`));
			}
			if (rows.length < 500) controller.close();
		},
	});
};
