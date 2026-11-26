import { listReturnSearchSchema } from "@/lib/list-return";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { DetailHeading } from "@/components/admin/detail-heading";
import { can } from "@/features/auth/permissions";
import { newProductSearchSchema } from "@/features/catalog/catalog-validation";
import { ProductForm } from "@/features/catalog/product-form";
import { readNewProduct } from "@/features/catalog/products.functions";

const NewProductPage = () => {
	const { categories, draft } = Route.useLoaderData();
	const { duplicate } = Route.useSearch();
	const { store } = Route.useRouteContext();
	return (
		<>
			<DetailHeading
				title={draft ? "Duplicate product" : "Add product"}
				description={
					draft
						? "Enter a new SKU and review the draft before saving."
						: "Set up a new catalog item."
				}
				back="/products"
				backLabel="Products"
			/>
			<ProductForm
				key={duplicate ?? "new"}
				categories={categories}
				draft={draft}
				currency={store.currency}
				editable
			/>
		</>
	);
};

export const Route = createFileRoute("/_admin/products/new")({
	validateSearch: listReturnSearchSchema.extend(newProductSearchSchema.shape),
	beforeLoad: ({ context }) => {
		if (!can(context.staff.role, "manageCommerce")) throw redirect({ to: "/access-denied" });
	},
	loaderDeps: ({ search }) => newProductSearchSchema.parse(search),
	loader: ({ context: { queryClient }, deps }) =>
		queryClient.fetchQuery({
			queryKey: ["new-product", deps.duplicate],
			queryFn: ({ signal }) => readNewProduct({ data: deps, signal }),
		}),
	component: NewProductPage,
});
