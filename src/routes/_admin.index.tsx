import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { PageHeading } from "@/components/admin/page-heading";
import { MetricCards } from "@/features/overview/metric-cards";
import { RecentOrders, StockWatch } from "@/features/overview/overview-panels";
import { defaultRange, overviewSearchSchema } from "@/features/overview/overview-validation";
import { readOverview } from "@/features/overview/overview.functions";
import { RangeSelect } from "@/features/overview/range-select";
import { ReportPeriod } from "@/features/overview/report-period";
import { RevenueChart } from "@/features/overview/revenue-chart";
import { WorkQueue } from "@/features/overview/work-queue";

const OverviewHeading = () => {
	const search = Route.useSearch();
	const { window } = Route.useLoaderData();
	const navigate = Route.useNavigate();
	return (
		<PageHeading title="Overview" description="Monitor sales, orders, and stock across your store.">
			<div className="flex flex-wrap gap-2">
				<RangeSelect
					key={`${search.from}/${search.through}`}
					search={search}
					window={window}
					onChange={(search) => navigate({ search })}
				/>
			</div>
		</PageHeading>
	);
};

const OverviewPage = () => {
	const { metrics, trend, orders, stock, window, work } = Route.useLoaderData();
	const { store } = Route.useRouteContext();
	return (
		<>
			<OverviewHeading />
			<WorkQueue counts={work} />
			<ReportPeriod window={window} />
			<MetricCards metrics={metrics} currency={store.currency} />
			<div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)]">
				<StockWatch stock={stock.rows} total={stock.total} alerts={stock.alerts} />
				<RecentOrders rows={orders} currency={store.currency} zone={store.timeZone} />
			</div>
			<RevenueChart
				key={`${window.currentFrom}/${window.to}`}
				points={trend}
				currency={store.currency}
			/>
		</>
	);
};

export const Route = createFileRoute("/_admin/")({
	validateSearch: overviewSearchSchema,
	search: { middlewares: [stripSearchParams({ range: defaultRange })] },
	loaderDeps: ({ search }) => search,
	loader: ({ context: { queryClient }, deps }) =>
		queryClient.fetchQuery({
			queryKey: ["overview", deps],
			queryFn: ({ signal }) => readOverview({ data: deps, signal }),
		}),
	component: OverviewPage,
});
