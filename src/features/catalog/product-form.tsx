import { useListReturn } from "@/components/admin/record-link";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AdminForm } from "@/components/admin/admin-form";
import { FormSection } from "@/components/admin/form-section";
import { NotesField, SelectField, TextField } from "@/components/admin/form-fields";
import { NativeSelectOption } from "@/components/ui/native-select";
import { moneyInput } from "@/lib/format";
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

const ProductIdentifiers = ({ product }: Pick<ProductFormProps, "product">) => (
	<div className="grid gap-4 sm:grid-cols-2">
		<TextField name="sku" label="SKU" maxLength={80} defaultValue={product?.sku} required />
		<TextField
			name="slug"
			label="Slug"
			maxLength={100}
			defaultValue={product?.slug}
			required
			pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
			hint="Lowercase letters, numbers, and hyphens."
		/>
	</div>
);

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
		<TextField name="name" label="Name" maxLength={120} defaultValue={product?.name} required />
		<ProductIdentifiers product={product} />
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
		<SelectField name="status" label="Status" defaultValue={product?.status ?? "draft"}>
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
	const navigate = useNavigate();
	const returnHref = useListReturn("/products");
	const save = useServerFn(writeProduct);
	return (
		<AdminForm
			onSave={editable ? (data) => save({ data }) : undefined}
			onSuccess={() => navigate({ href: returnHref })}
			submitLabel={product ? "Save product" : "Create product"}
		>
			<input type="hidden" name="id" value={product?.id ?? ""} />
			<div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
				<ProductDetails product={product} categories={categories} />
				<ProductSettings product={product} currency={currency} />
			</div>
		</AdminForm>
	);
};
