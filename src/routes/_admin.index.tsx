import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { NewRecord } from "@/components/admin/new-record";
import { PageHeading } from "@/components/admin/page-heading";
import { can } from "@/features/auth/permissions";
import { MetricCards } from "@/features/overview/metric-cards";
import { RecentOrders, StockWatch } from "@/features/overview/overview-panels";
import { defaultRange, overviewSearchSchema } from "@/features/overview/overview-validation";
import { readOverview } from "@/features/overview/overview.functions";
import { RangeSelect } from "@/features/overview/range-select";
import { RevenueChart } from "@/features/overview/revenue-chart";

const OverviewHeading = () => {
	const { staff } = Route.useRouteContext();
	const { range } = Route.useSearch();
	const navigate = Route.useNavigate();
	return (
		<PageHeading title="Overview" description="Monitor sales, orders, and stock across your store.">
			<div className="flex flex-wrap gap-2">
				<RangeSelect range={range} onChange={(range) => navigate({ search: { range } })} />
				{can(staff.role, "manageCommerce") && <NewRecord to="/products/new" label="Add product" />}
			</div>
		</PageHeading>
	);
};

const OverviewPage = () => {
	const { metrics, trend, orders, stock } = Route.useLoaderData();
	const { store } = Route.useRouteContext();
	const { range } = Route.useSearch();
	return (
		<>
			<OverviewHeading />
			<MetricCards metrics={metrics} currency={store.currency} />
			<div className="grid min-w-0 items-stretch gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
				<RevenueChart key={range} points={trend} currency={store.currency} range={range} />
				<StockWatch stock={stock} />
			</div>
			<RecentOrders rows={orders} currency={store.currency} zone={store.timeZone} />
		</>
	);
};

export const Route = createFileRoute("/_admin/")({
	validateSearch: overviewSearchSchema,
	search: { middlewares: [stripSearchParams({ range: defaultRange })] },
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => readOverview({ data: deps }),
	component: OverviewPage,
});
