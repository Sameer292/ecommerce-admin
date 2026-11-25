import {
	ChartLineData01Icon,
	DollarCircleIcon,
	ShoppingBag01Icon,
	UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCount, formatMoney } from "@/lib/format";
import type { Comparison, DashboardMetrics } from "./overview.types";

const changes = new Intl.NumberFormat("en-US", {
	style: "percent",
	maximumFractionDigits: 1,
	signDisplay: "exceptZero",
});

const MetricChange = ({ current, previous }: Comparison) => {
	if (previous === 0) return <p className="text-xs text-muted-foreground">No prior-period data</p>;
	const change = (current - previous) / previous;
	return (
		<p className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
			<strong className={change >= 0 ? "text-success" : "text-destructive"}>
				{changes.format(change)}
			</strong>
			<span>vs. previous period</span>
		</p>
	);
};

type MetricCardProps = {
	label: string;
	value: string;
	change: Comparison;
	icon: typeof DollarCircleIcon;
};

const MetricCard = ({ label, value, change, icon }: MetricCardProps) => (
	<Card size="sm" className="min-w-0 gap-2 p-3 sm:gap-4 sm:p-5">
		<CardHeader className="flex flex-row items-center justify-between gap-2 px-0">
			<h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
			<div className="grid size-8 shrink-0 place-items-center rounded-lg border bg-muted/35 text-muted-foreground">
				<HugeiconsIcon icon={icon} className="size-4" aria-hidden />
			</div>
		</CardHeader>
		<CardContent className="flex flex-col gap-2 px-0">
			<p className="font-heading text-xl font-semibold tracking-tight tabular-nums sm:text-[1.75rem]">
				{value}
			</p>
			<MetricChange {...change} />
		</CardContent>
	</Card>
);

const metricCards = (metrics: DashboardMetrics, currency: string): MetricCardProps[] => [
	{
		label: "Paid sales",
		value: formatMoney(metrics.sales.current, currency),
		change: metrics.sales,
		icon: DollarCircleIcon,
	},
	{
		label: "Orders placed",
		value: formatCount(metrics.orders.current),
		change: metrics.orders,
		icon: ShoppingBag01Icon,
	},
	{
		label: "Average order value",
		value: formatMoney(metrics.average.current, currency),
		change: metrics.average,
		icon: ChartLineData01Icon,
	},
	{
		label: "New customers",
		value: formatCount(metrics.customers.current),
		change: metrics.customers,
		icon: UserMultipleIcon,
	},
];

export const MetricCards = ({
	metrics,
	currency,
}: {
	metrics: DashboardMetrics;
	currency: string;
}) => (
	<div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
		{metricCards(metrics, currency).map((metric) => (
			<MetricCard key={metric.label} {...metric} />
		))}
	</div>
);
