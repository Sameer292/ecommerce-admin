import { useListReturn } from "@/components/admin/record-link";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AdminForm } from "@/components/admin/admin-form";
import { FormSection } from "@/components/admin/form-section";
import { NotesField, SelectField, TextField } from "@/components/admin/form-fields";
import { NativeSelectOption } from "@/components/ui/native-select";
import { moneyInput } from "@/lib/format";
import { CatalogNameFields } from "./catalog-name-fields";
import { productStatuses, productStatusLabels } from "./catalog-options";
import { httpsImageUrlPattern } from "./catalog-validation";
import type { CategoryOption, Product } from "./catalog.types";
import { writeProduct } from "./products.functions";

type ProductFormProps = {
	product?: Product;
	categories: CategoryOption[];
	currency: string;
	editable: boolean;
};

const ProductCategory = ({
	product,
	categories,
}: Pick<ProductFormProps, "product" | "categories">) => (
	<SelectField name="categoryId" label="Category" defaultValue={product?.categoryId ?? ""}>
		<NativeSelectOption value="">Uncategorized</NativeSelectOption>
		{categories.map(({ id, name }) => (
			<NativeSelectOption key={id} value={id}>
				{name}
			</NativeSelectOption>
		))}
	</SelectField>
);

const ProductDetails = ({
	product,
	categories,
}: Pick<ProductFormProps, "product" | "categories">) => (
	<FormSection title="Product details">
		<CatalogNameFields initialName={product?.name} initialSlug={product?.slug} />
		<TextField name="sku" label="SKU" maxLength={80} defaultValue={product?.sku} required />
		<NotesField
			name="description"
			label="Description"
			maxLength={1000}
			defaultValue={product?.description}
		/>
		<ProductCategory product={product} categories={categories} />
		<TextField
			name="imageUrl"
			label="Image URL"
			type="url"
			pattern={httpsImageUrlPattern}
			placeholder="https://"
			hint="Use an HTTPS image URL."
			maxLength={2000}
			defaultValue={product?.imageUrl}
		/>
	</FormSection>
);

const ProductSettings = ({ product, currency }: Pick<ProductFormProps, "product" | "currency">) => (
	<FormSection title="Pricing and availability">
		<TextField
			name="price"
			label={`Price (${currency})`}
			inputMode="decimal"
			maxLength={24}
			required
			defaultValue={product ? moneyInput(product.priceMinor, currency) : undefined}
		/>
		<SelectField name="status" required label="Status" defaultValue={product?.status ?? "draft"}>
			{productStatuses.map((status) => (
				<NativeSelectOption key={status} value={status}>
					{productStatusLabels[status]}
				</NativeSelectOption>
			))}
		</SelectField>
		<TextField
			name="lowStockThreshold"
			label="Low-stock threshold"
			type="number"
			min={0}
			max={1000000}
			required
			defaultValue={product?.lowStockThreshold ?? 5}
			hint="Inventory flags this product at or below this quantity."
		/>
	</FormSection>
);

export const ProductForm = ({ product, categories, currency, editable }: ProductFormProps) => {
	const [version] = useState(product?.version);
	const navigate = useNavigate();
	const returnHref = useListReturn("/products");
	const save = useServerFn(writeProduct);
	return (
		<AdminForm
			onSave={editable ? (data) => save({ data }) : undefined}
			onSuccess={() => navigate({ href: returnHref })}
			cancelHref={returnHref}
			stickyActions
			requireChanges={Boolean(product)}
			submitLabel={product ? "Save product" : "Create product"}
			successMessage={product ? "Product saved." : "Product created."}
		>
			<input type="hidden" name="id" value={product?.id ?? ""} />
			{product && <input type="hidden" name="version" value={version} />}
			<div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
				<ProductDetails product={product} categories={categories} />
				<ProductSettings product={product} currency={currency} />
			</div>
		</AdminForm>
	);
};
