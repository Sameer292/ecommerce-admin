import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import {
	ChartLineData01Icon,
	DollarCircleIcon,
	ShoppingBag01Icon,
	UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCount, formatMoney } from "@/lib/format";
import type { Comparison, DashboardMetrics, TrendMetric } from "./overview.types";

export const trendLabels = {
	orders: "Orders",
	sales: "Paid sales",
	customers: "New customers",
} satisfies Record<TrendMetric, string>;

const trendIcons = {
	orders: ShoppingBag01Icon,
	sales: DollarCircleIcon,
	customers: UserMultipleIcon,
};

const changes = new Intl.NumberFormat("en-US", {
	style: "percent",
	maximumFractionDigits: 1,
	signDisplay: "exceptZero",
});

const MetricChange = ({
	current,
	previous,
	lowerIsBetter = false,
}: Comparison & { lowerIsBetter?: boolean }) => {
	if (previous === 0)
		return <span className="text-xs text-muted-foreground">Previous period was zero</span>;
	const change = (current - previous) / Math.abs(previous);
	return (
		<span className="flex flex-wrap gap-x-1.5 text-xs text-muted-foreground">
			<strong
				className={
					(lowerIsBetter ? change <= 0 : change >= 0) ? "text-success" : "text-destructive"
				}
			>
				{changes.format(change)}
			</strong>
			<span>vs. previous period</span>
		</span>
	);
};

type MetricCardProps = {
	label: string;
	value: string;
	change: Comparison;
	icon: typeof DollarCircleIcon;
	lowerIsBetter?: boolean;
	description?: string;
};

const MetricCard = ({
	label,
	value,
	change,
	icon,
	lowerIsBetter,
	description,
}: MetricCardProps) => (
	<Card size="sm" className="min-w-0 gap-1.5 p-3 sm:gap-4 sm:p-5">
		<CardHeader className="flex flex-row items-center justify-between gap-2 px-0">
			<h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
			<div className="hidden size-8 shrink-0 place-items-center rounded-lg border bg-muted/35 text-muted-foreground sm:grid">
				<HugeiconsIcon icon={icon} className="size-4" aria-hidden />
			</div>
		</CardHeader>
		<CardContent className="flex flex-col gap-1 px-0 sm:gap-2">
			<p className="font-heading text-xl font-semibold tracking-tight tabular-nums sm:text-[1.75rem]">
				{value}
			</p>
			<MetricChange {...change} lowerIsBetter={lowerIsBetter} />
			{description && <p className="text-xs text-muted-foreground">{description}</p>}
		</CardContent>
	</Card>
);

const summaryCards = (metrics: DashboardMetrics, currency: string): MetricCardProps[] => [
	{
		label: "Refunds",
		value: formatMoney(metrics.refunds.current, currency),
		change: metrics.refunds,
		icon: DollarCircleIcon,
		lowerIsBetter: true,
	},
	{
		label: "Net after refunds",
		value: formatMoney(metrics.net.current, currency),
		change: metrics.net,
		icon: DollarCircleIcon,
	},
	{
		label: "Average order value",
		value: formatMoney(metrics.average.current, currency),
		change: metrics.average,
		icon: ChartLineData01Icon,
		description: `${formatCount(metrics.paidOrders.current)} paid orders · ${formatCount(metrics.paidOrders.previous)} in the previous period`,
	},
];

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
		className="grid grid-cols-3 gap-2 sm:gap-3"
	>
		{(["orders", "sales", "customers"] as const).map((metric) => (
			<Toggle
				key={metric}
				value={metric}
				aria-controls="overview-trend"
				className="flex min-w-0 cursor-pointer flex-col gap-1.5 rounded-xl border bg-card p-2.5 text-start text-card-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-pressed:border-primary data-pressed:bg-primary/5 sm:gap-2 sm:p-4"
			>
				<span className="flex min-h-8 w-full items-start justify-between gap-2 sm:min-h-0 sm:items-center">
					<span className="text-xs font-medium sm:text-sm">{trendLabels[metric]}</span>
					<HugeiconsIcon
						icon={trendIcons[metric]}
						className="hidden size-4 shrink-0 text-muted-foreground sm:block"
						aria-hidden
					/>
				</span>
				<span className="font-heading w-full wrap-anywhere text-sm font-semibold tracking-tight tabular-nums sm:text-2xl">
					{metric === "sales"
						? formatMoney(metrics.sales.current, currency)
						: formatCount(metrics[metric].current)}
				</span>
				<MetricChange {...metrics[metric]} />
			</Toggle>
		))}
	</ToggleGroup>
);

export const SummaryCards = ({
	metrics,
	currency,
}: {
	metrics: DashboardMetrics;
	currency: string;
}) => (
	<div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
		{summaryCards(metrics, currency).map((metric) => (
			<MetricCard key={metric.label} {...metric} />
		))}
	</div>
);
