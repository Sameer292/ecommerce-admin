import { useListReturn } from "@/components/admin/record-link";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AdminForm } from "@/components/admin/admin-form";
import { FormSection } from "@/components/admin/form-section";
import { NotesField, TextField } from "@/components/admin/form-fields";
import { SelectField } from "@/components/admin/select-field";
import { moneyInput } from "@/lib/format";
import { CatalogNameFields } from "./catalog-name-fields";
import { ProductPublication, type PublicationFields } from "./product-publication";
import { ProductImageField } from "./product-image-field";
import { productStatusOptions } from "./catalog-options";
import type { CategoryOption, Product } from "./catalog.types";
import { writeProduct } from "./products.functions";

type ProductDefaults = Pick<
	Product,
	"name" | "sku" | "description" | "categoryId" | "imageUrl" | "priceMinor" | "status"
> & { slug?: string; publishedAt?: Date | null };

type ProductFormProps = {
	product?: Product;
	draft?: ProductDefaults & { managedImage?: string; imageSourceId?: string; variantOf?: string };
	managedImage?: string;
	categories: CategoryOption[];
	currency: string;
	editable: boolean;
};

const ProductDetails = ({
	product,
	categories,
	onCategoryChange,
}: {
	product?: ProductDefaults;
	categories: CategoryOption[];
	onCategoryChange: (value: string | null) => void;
}) => (
	<FormSection title="Product details">
		<CatalogNameFields
			initialName={product?.name}
			initialSlug={product?.slug}
			published={Boolean(product?.publishedAt)}
		/>
		<TextField
			name="sku"
			label="SKU"
			maxLength={80}
			defaultValue={product?.sku}
			readOnly={Boolean(product?.publishedAt)}
			hint={
				product?.publishedAt
					? "Published SKUs are retained for order and inventory integrations."
					: undefined
			}
			required
		/>
		<NotesField
			name="description"
			label="Description"
			maxLength={1000}
			defaultValue={product?.description}
		/>
		<SelectField
			name="categoryId"
			label="Category"
			defaultValue={product?.categoryId ?? ""}
			onValueChange={onCategoryChange}
			items={[
				{ value: "", label: "Uncategorized" },
				...categories.map(({ id, name }) => ({ value: id, label: name })),
			]}
		/>
	</FormSection>
);

const ProductSettings = ({
	product,
	currency,
	onStatusChange,
}: {
	product?: ProductDefaults;
	currency: string;
	onStatusChange: (value: string | null) => void;
}) => (
	<FormSection title="Pricing and availability">
		<TextField
			name="price"
			label={`Price (${currency})`}
			inputMode="decimal"
			maxLength={24}
			required
			defaultValue={product ? moneyInput(product.priceMinor, currency) : undefined}
		/>
		<SelectField
			name="status"
			required
			label="Status"
			defaultValue={product?.status ?? "draft"}
			onValueChange={onStatusChange}
			items={productStatusOptions}
		/>
	</FormSection>
);

export const ProductForm = ({
	product,
	draft,
	managedImage,
	categories,
	currency,
	editable,
}: ProductFormProps) => {
	const [version] = useState(product?.version);
	const defaults = product ?? draft;
	const variantOf = product?.variantOf ?? draft?.variantOf;
	const storedImage = managedImage ?? draft?.managedImage ?? "";
	const [photo, setPhoto] = useState(storedImage || defaults?.imageUrl || "");
	const [publication, setPublication] = useState<PublicationFields>(() => ({
		name: defaults?.name ?? "",
		description: defaults?.description ?? "",
		categoryId: defaults?.categoryId ?? "",
		price: defaults ? moneyInput(defaults.priceMinor, currency) : "",
		status: defaults?.status ?? "draft",
	}));
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
			{variantOf && <input type="hidden" name="variantOf" value={variantOf} />}
			{draft?.imageSourceId && (
				<input type="hidden" name="imageSourceId" value={draft.imageSourceId} />
			)}
			{product && <input type="hidden" name="version" value={version} />}
			<div
				className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
				onChange={(event) => {
					const field = event.target;
					if (
						(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) &&
						Object.hasOwn(publication, field.name)
					) {
						const { name, value } = field;
						setPublication((previous) => ({ ...previous, [name]: value }));
					}
				}}
			>
				<div className="flex min-w-0 flex-col gap-4">
					<ProductDetails
						product={defaults}
						categories={categories}
						onCategoryChange={(value) =>
							setPublication((previous) => ({ ...previous, categoryId: value ?? "" }))
						}
					/>
					{variantOf && (
						<FormSection title="Variant options">
							<NotesField
								name="variantOptions"
								label="Options, one per line"
								placeholder={"Size: Medium\nColor: Blue"}
								maxLength={580}
								rows={4}
								required
								defaultValue={product?.variantOptions
									.map(({ name, value }) => `${name}: ${value}`)
									.join("\n")}
							/>
						</FormSection>
					)}
					<ProductImageField
						external={defaults?.imageUrl ?? ""}
						managed={storedImage}
						editable={editable}
						onPreview={setPhoto}
					/>
				</div>
				<div className="flex min-w-0 flex-col gap-4">
					<ProductSettings
						product={defaults}
						currency={currency}
						onStatusChange={(value) =>
							setPublication((previous) => ({ ...previous, status: value ?? "draft" }))
						}
					/>
					<ProductPublication fields={publication} photo={photo} currency={currency} />
				</div>
			</div>
		</AdminForm>
	);
};
