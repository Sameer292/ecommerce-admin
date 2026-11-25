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
	if (previous === 0)
		return <p className="text-xs text-muted-foreground">Previous period was zero</p>;
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
		description: `${formatCount(metrics.paidOrders.current)} paid orders · ${formatCount(metrics.paidOrders.previous)} in the previous period`,
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
		<details className="text-xs text-muted-foreground">
			<summary className="w-fit cursor-pointer font-medium text-foreground">
				How metrics are calculated
			</summary>
			<ul className="mt-2 list-disc space-y-1 pl-5">
				<li>
					Paid sales sum order totals on the payment date, including tax and shipping and after
					discounts. Cancelling a paid order leaves its payment in that total.
				</li>
				<li>
					Refunds are counted on the refund date and subtracted from paid sales to calculate net.
					Older refunds with no known date are excluded.
				</li>
				<li>
					Average order value divides paid sales by the number of paid orders in the period. Orders
					placed counts all new orders, including unpaid and cancelled orders.
				</li>
				<li>New customers counts customer profiles created during the period.</li>
			</ul>
		</details>
	</div>
);
