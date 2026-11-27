import { redirectInvalidPages } from "@/lib/pagination-redirect";
import { listReturnSearchSchema } from "@/lib/list-return";
import { idSchema } from "@/lib/validation";
import { createFileRoute, notFound, stripSearchParams } from "@tanstack/react-router";
import { DetailHeading } from "@/components/admin/detail-heading";
import { can } from "@/features/auth/permissions";
import { readStock } from "@/features/inventory/inventory.functions";
import { AdjustStockForm, StockHistory, StockSummary } from "@/features/inventory/stock-detail";
import { stockHistorySearchSchema } from "@/features/inventory/inventory-validation";

const StockHistoryTable = () => {
	const { history } = Route.useLoaderData();
	const { store } = Route.useRouteContext();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	return (
		<StockHistory
			{...history}
			zone={store.timeZone}
			pagination={{
				page: search.page,
				size: search.perPage,
				onPage: (page) => navigate({ search: { ...search, page } }),
				onSize: (perPage) => navigate({ search: { ...search, page: 1, perPage } }),
			}}
			sorting={{
				value: search.sort ?? "date.desc",
				onChange: (sort) =>
					navigate({
						search: { ...search, ...stockHistorySearchSchema.parse({ ...search, page: 1, sort }) },
					}),
			}}
		/>
	);
};

const StockPage = () => {
	const { product, adjustmentId } = Route.useLoaderData();
	const { staff } = Route.useRouteContext();
	return (
		<>
			<DetailHeading
				title={product.name}
				description={`Inventory · SKU ${product.sku}`}
				back="/inventory"
				backLabel="Inventory"
			/>
			<div className="grid items-start gap-4 md:grid-cols-2">
				<StockSummary product={product} />
				{can(staff.role, "manageCommerce") && (
					<AdjustStockForm key={adjustmentId} product={product} adjustmentId={adjustmentId} />
				)}
			</div>
			<StockHistoryTable />
		</>
	);
};

export const Route = createFileRoute("/_admin/inventory/$productId")({
	validateSearch: stockHistorySearchSchema.extend(listReturnSearchSchema.shape),
	search: { middlewares: [stripSearchParams({ page: 1 })] },
	loaderDeps: ({ search }) => stockHistorySearchSchema.parse(search),
	loader: async ({ context: { queryClient }, deps, params, location }) => {
		if (!idSchema.safeParse({ id: params.productId }).success) throw notFound();
		const data = await queryClient.query({
			queryKey: ["stock", params.productId, deps],
			queryFn: ({ signal }) => readStock({ data: { id: params.productId, ...deps }, signal }),
		});
		redirectInvalidPages(location.pathname, { ...location.search, ...deps }, data.history.total);
		return data;
	},
	component: StockPage,
});
