import { redirectInvalidPages } from "@/lib/pagination-redirect";
import { pageSearchDefaults } from "@/lib/pagination";
import { createFileRoute, Link, stripSearchParams } from "@tanstack/react-router";
import { NewRecord } from "@/components/admin/new-record";
import { PageHeading } from "@/components/admin/page-heading";
import { buttonVariants } from "@/components/ui/button";
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
				{can(staff.role, "manageCommerce") && (
					<div className="flex w-full flex-wrap items-center justify-between gap-2 md:ml-auto md:w-auto">
						<Link
							to="/product-import"
							className={buttonVariants({
								variant: "outline",
								size: "lg",
								className: "border-input bg-input/30 hover:bg-input/50",
							})}
						>
							Catalog CSV
						</Link>
						<NewRecord to="/products/new" label="Add product" />
					</div>
				)}
			</PageHeading>
			<ProductList
				{...data}
				search={search}
				canCreate={can(staff.role, "manageCommerce")}
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
	loader: async ({ context: { queryClient }, deps, location }) => {
		const data = await queryClient.query({
			queryKey: ["products", deps],
			queryFn: ({ signal }) => readProducts({ data: deps, signal }),
		});
		redirectInvalidPages(location.pathname, { ...location.search, ...deps }, data.total);
		return data;
	},
	component: ProductsPage,
});
