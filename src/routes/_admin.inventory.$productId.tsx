import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
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
			page={search.page}
			zone={store.timeZone}
			onPage={(page) => navigate({ search: { ...search, page } })}
			sorting={{
				value: search.sort ?? "date.desc",
				onChange: (sort) => navigate({ search: stockHistorySearchSchema.parse({ page: 1, sort }) }),
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
					<AdjustStockForm key={adjustmentId} productId={product.id} adjustmentId={adjustmentId} />
				)}
			</div>
			<StockHistoryTable />
		</>
	);
};

export const Route = createFileRoute("/_admin/inventory/$productId")({
	validateSearch: stockHistorySearchSchema,
	search: { middlewares: [stripSearchParams({ page: 1 })] },
	loaderDeps: ({ search }) => search,
	loader: ({ context: { queryClient }, deps, params }) =>
		queryClient.fetchQuery({
			queryKey: ["stock", params.productId, deps],
			queryFn: ({ signal }) => readStock({ data: { id: params.productId, ...deps }, signal }),
		}),
	component: StockPage,
});
