import { createFileRoute } from "@tanstack/react-router";
import { DetailHeading } from "@/components/admin/detail-heading";
import { can } from "@/features/auth/permissions";
import { readStock } from "@/features/inventory/inventory.functions";
import { AdjustStockForm, StockHistory, StockSummary } from "@/features/inventory/stock-detail";
import { pageSearchSchema } from "@/lib/pagination";

const StockPage = () => {
	const { product, history, adjustmentId } = Route.useLoaderData();
	const { staff, store } = Route.useRouteContext();
	const { page } = Route.useSearch();
	const navigate = Route.useNavigate();
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
			<StockHistory
				{...history}
				page={page}
				zone={store.timeZone}
				onPage={(page) => navigate({ search: { page } })}
			/>
		</>
	);
};

export const Route = createFileRoute("/_admin/inventory/$productId")({
	validateSearch: pageSearchSchema.pick({ page: true }),
	loaderDeps: ({ search }) => search,
	loader: ({ deps, params }) => readStock({ data: { id: params.productId, page: deps.page } }),
	component: StockPage,
});
