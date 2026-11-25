import { createFileRoute, redirect } from "@tanstack/react-router";
import { DetailHeading } from "@/components/admin/detail-heading";
import { can } from "@/features/auth/permissions";
import { ProductForm } from "@/features/catalog/product-form";
import { readNewProduct } from "@/features/catalog/products.functions";

const NewProductPage = () => {
	const categories = Route.useLoaderData();
	const { store } = Route.useRouteContext();
	return (
		<>
			<DetailHeading
				title="Add product"
				description="Set up a new catalog item."
				back="/products"
				backLabel="Products"
			/>
			<ProductForm categories={categories} currency={store.currency} editable />
		</>
	);
};

export const Route = createFileRoute("/_admin/products/new")({
	beforeLoad: ({ context }) => {
		if (!can(context.staff.role, "manageCommerce")) throw redirect({ to: "/products" });
	},
	loader: ({ context: { queryClient } }) =>
		queryClient.fetchQuery({
			queryKey: ["new-product"],
			queryFn: ({ signal }) => readNewProduct({ signal }),
		}),
	component: NewProductPage,
});
