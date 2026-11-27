import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { ChartDownIcon, ChartUpIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useId } from "react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardAction,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatCount, formatMoney } from "@/lib/format";
import type { Comparison, DashboardMetrics, TrendMetric } from "./overview.types";

export const trendLabels = {
	orders: "Orders",
	sales: "Paid sales",
	customers: "New customers",
} satisfies Record<TrendMetric, string>;

const changes = new Intl.NumberFormat("en-US", {
	style: "percent",
	maximumFractionDigits: 1,
	signDisplay: "exceptZero",
});

const MetricCard = ({
	label,
	value,
	change,
	metric,
	detail,
	lowerIsBetter = false,
}: {
	label: string;
	value: string;
	change: Comparison;
	metric?: TrendMetric;
	detail?: string;
	lowerIsBetter?: boolean;
}) => {
	const id = useId();
	const difference = change.previous
		? (change.current - change.previous) / Math.abs(change.previous)
		: null;
	return (
		<Card className="@container/card relative min-w-0 gap-2 bg-linear-to-t from-primary/5 to-card shadow-xs has-data-pressed:ring-primary has-focus-visible:ring-2 has-focus-visible:ring-ring sm:gap-3">
			<CardHeader className="has-data-[slot=card-action]:grid-cols-[minmax(0,1fr)_auto]">
				<CardDescription id={id} className="text-xs leading-snug sm:text-sm">
					{label}
				</CardDescription>
				<CardTitle
					id={`${id}-value`}
					className="col-span-full text-lg font-semibold wrap-anywhere tabular-nums @[180px]/card:text-2xl @[250px]/card:text-3xl"
				>
					{value}
				</CardTitle>
				{difference !== null && (
					<CardAction className="row-span-1">
						<Badge
							variant="outline"
							className={
								(lowerIsBetter ? difference <= 0 : difference >= 0)
									? "text-success"
									: "text-destructive"
							}
						>
							{difference !== 0 && (
								<HugeiconsIcon
									icon={difference > 0 ? ChartUpIcon : ChartDownIcon}
									aria-hidden
									className="hidden @[185px]/card:block"
								/>
							)}
							{changes.format(difference)}
						</Badge>
					</CardAction>
				)}
			</CardHeader>
			<CardFooter className="border-0 bg-transparent pt-0 text-xs text-muted-foreground">
				{detail ?? (difference === null ? "Previous period was zero" : "vs. previous period")}
			</CardFooter>
			{metric && (
				<Toggle
					value={metric}
					aria-labelledby={`${id} ${id}-value`}
					aria-controls="overview-trend"
					className="absolute inset-0 cursor-pointer rounded-xl outline-none"
				/>
			)}
		</Card>
	);
};

export const MetricCards = ({
	metrics,
	currency,
	selected,
	onSelect,
}: {
	metrics: DashboardMetrics;
	currency: string;
	selected: TrendMetric;
	onSelect: (metric: TrendMetric) => void;
}) => (
	<ToggleGroup
		aria-label="Dashboard metrics"
		value={[selected]}
		onValueChange={([metric]) => {
			if (metric) onSelect(metric);
		}}
		className="grid grid-cols-2 gap-3 @5xl/main:grid-cols-4 sm:gap-4"
	>
		{(["orders", "sales", "customers"] as const).map((metric) => (
			<MetricCard
				key={metric}
				metric={metric}
				label={trendLabels[metric]}
				value={
					metric === "sales"
						? formatMoney(metrics.sales.current, currency)
						: formatCount(metrics[metric].current)
				}
				change={metrics[metric]}
			/>
		))}
		<MetricCard
			label="Average order value"
			value={formatMoney(metrics.average.current, currency)}
			change={metrics.average}
			detail={`${formatCount(metrics.paidOrders.current)} paid orders`}
		/>
	</ToggleGroup>
);

export const SummaryCards = ({
	metrics,
	currency,
}: {
	metrics: DashboardMetrics;
	currency: string;
}) => (
	<div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4">
		<MetricCard
			label="Refunds"
			value={formatMoney(metrics.refunds.current, currency)}
			change={metrics.refunds}
			lowerIsBetter
		/>
		<MetricCard
			label="Net after refunds"
			value={formatMoney(metrics.net.current, currency)}
			change={metrics.net}
		/>
	</div>
);
