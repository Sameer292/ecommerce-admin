import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { useState } from "react";
import { MetricCards, SummaryCards } from "@/features/overview/metric-cards";
import { RecentOrders, StockWatch } from "@/features/overview/overview-panels";
import { defaultRange, overviewSearchSchema } from "@/features/overview/overview-validation";
import { readOverview } from "@/features/overview/overview.functions";
import type { TrendMetric } from "@/features/overview/overview.types";
import { RangeSelect } from "@/features/overview/range-select";
import { TrendChart } from "@/features/overview/trend-chart";
import { WorkQueue } from "@/features/overview/work-queue";

const ReportControls = () => {
	const { range } = Route.useSearch();
	const navigate = Route.useNavigate();
	return <RangeSelect range={range} onChange={(range) => navigate({ search: { range } })} />;
};

const OverviewPage = () => {
	const { metrics, trend, orders, stock, work } = Route.useLoaderData();
	const { store } = Route.useRouteContext();
	const [metric, selectMetric] = useState<TrendMetric>("orders");
	return (
		<>
			<h1 className="sr-only">Dashboard</h1>
			<MetricCards
				metrics={metrics}
				currency={store.currency}
				selected={metric}
				onSelect={selectMetric}
			/>
			<TrendChart
				points={trend}
				currency={store.currency}
				metric={metric}
				controls={<ReportControls />}
			/>
			<RecentOrders rows={orders} currency={store.currency} zone={store.timeZone} />
			<WorkQueue counts={work} />
			<div className="grid min-w-0 items-start gap-4 @4xl/main:grid-cols-2">
				<StockWatch stock={stock.rows} total={stock.total} />
				<SummaryCards metrics={metrics} currency={store.currency} />
			</div>
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
