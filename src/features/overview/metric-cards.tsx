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

const MetricChange = ({
	current,
	previous,
	lowerIsBetter = false,
}: Comparison & { lowerIsBetter?: boolean }) => {
	if (previous === 0) return <p className="text-xs text-muted-foreground">No prior-period data</p>;
	const change = (current - previous) / Math.abs(previous);
	return (
		<p className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
			<strong
				className={
					(lowerIsBetter ? change <= 0 : change >= 0) ? "text-success" : "text-destructive"
				}
			>
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
	lowerIsBetter?: boolean;
};

const MetricCard = ({ label, value, change, icon, lowerIsBetter }: MetricCardProps) => (
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
	<div className="flex flex-col gap-2">
		<div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
			{metricCards(metrics, currency).map((metric) => (
				<MetricCard key={metric.label} {...metric} />
			))}
		</div>
		<p className="text-xs text-muted-foreground">
			Reports exclude legacy refunds with an unknown refund date.
		</p>
	</div>
);
