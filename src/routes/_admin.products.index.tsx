import { pageSearchDefaults } from "@/lib/pagination";
import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { NewRecord } from "@/components/admin/new-record";
import { PageHeading } from "@/components/admin/page-heading";
import { can } from "@/features/auth/permissions";
import { productSearchSchema } from "@/features/catalog/catalog-validation";
import { ProductList } from "@/features/catalog/product-list";
import { readProducts } from "@/features/catalog/products.functions";

const ProductsPage = () => {
	const data = Route.useLoaderData();
	const search = Route.useSearch();
	const { store, staff } = Route.useRouteContext();
	const navigate = Route.useNavigate();
	return (
		<>
			<PageHeading
				title="Products"
				description="Manage items, pricing, and visibility across your catalog."
			>
				{can(staff.role, "manageCommerce") && <NewRecord to="/products/new" label="Add product" />}
			</PageHeading>
			<ProductList
				{...data}
				search={search}
				currency={store.currency}
				zone={store.timeZone}
				onSearch={(search) => navigate({ search })}
			/>
		</>
	);
};

export const Route = createFileRoute("/_admin/products/")({
	validateSearch: productSearchSchema,
	search: { middlewares: [stripSearchParams(pageSearchDefaults)] },
	loaderDeps: ({ search }) => search,
	loader: ({ context: { queryClient }, deps }) =>
		queryClient.fetchQuery({
			queryKey: ["products", deps],
			queryFn: ({ signal }) => readProducts({ data: deps, signal }),
		}),
	component: ProductsPage,
});
