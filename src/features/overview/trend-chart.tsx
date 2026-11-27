import { useId, type ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@/components/ui/chart";
import { formatCount, formatDate, formatMoney } from "@/lib/format";
import { trendLabels } from "./metric-cards";
import type { TrendMetric, TrendPoint } from "./overview.types";
import { reportDate } from "./report-dates";

type ChartProps = {
	points: TrendPoint[];
	currency: string;
	metric: TrendMetric;
	controls?: ReactNode;
};
type SeriesProps = {
	points: TrendPoint[];
	metric: TrendMetric;
	format: (amount: number) => string;
};

const periodLabel = ({ date, through, partial }: TrendPoint) => {
	const period = date === through ? reportDate(date) : `${reportDate(date)}–${reportDate(through)}`;
	return partial ? `${period} (partial)` : period;
};

const chartConfig = {
	orders: { label: trendLabels.orders, color: "var(--primary)" },
	sales: { label: trendLabels.sales, color: "var(--primary)" },
	customers: { label: trendLabels.customers, color: "var(--primary)" },
} satisfies ChartConfig;

const ChartPlot = ({ points, metric, format }: SeriesProps) => {
	const fill = useId();
	return (
		<ChartContainer
			config={chartConfig}
			className="aspect-auto h-48 w-full rounded-sm has-focus-visible:ring-2 has-focus-visible:ring-ring sm:h-60 lg:h-62.5"
		>
			<AreaChart
				accessibilityLayer
				aria-label={`${trendLabels[metric]} over time`}
				data={points}
				margin={{ top: 8, right: 12, left: 0 }}
			>
				<defs>
					<linearGradient id={fill} x1="0" y1="0" x2="0" y2="1">
						<stop offset="5%" stopColor={`var(--color-${metric})`} stopOpacity={0.48} />
						<stop offset="95%" stopColor={`var(--color-${metric})`} stopOpacity={0.04} />
					</linearGradient>
				</defs>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="date"
					tickFormatter={reportDate}
					tickLine={false}
					axisLine={false}
					tickMargin={8}
					minTickGap={18}
					interval="preserveStartEnd"
				/>
				<YAxis
					allowDecimals={false}
					axisLine={false}
					tickLine={false}
					tickMargin={8}
					tickCount={5}
					tickFormatter={format}
					width="auto"
				/>
				<ChartTooltip
					content={
						<ChartTooltipContent
							labelFormatter={(date) => {
								const point = points.find((point) => point.date === date);
								return point ? periodLabel(point) : date;
							}}
							formatter={(value) => (
								<>
									<span className="text-muted-foreground">{trendLabels[metric]}</span>
									<span className="ml-auto font-mono font-medium tabular-nums">
										{format(Number(value))}
									</span>
								</>
							)}
						/>
					}
				/>
				<Area
					dataKey={metric}
					type="monotone"
					stroke={`var(--color-${metric})`}
					fill={`url(#${fill})`}
					strokeWidth={2}
					dot={points.length === 1}
					activeDot={{ r: 5, stroke: "var(--card)" }}
					isAnimationActive={false}
				/>
			</AreaChart>
		</ChartContainer>
	);
};

export const TrendChart = ({ points, currency, metric, controls }: ChartProps) => {
	const first = points.at(0);
	const last = points.at(-1);
	const dateLabel = (date: string) => formatDate(new Date(`${date}T00:00:00Z`), "UTC");
	const weekly = points.some(({ date, through }) => date !== through);
	const format =
		metric === "sales" ? (amount: number) => formatMoney(amount, currency) : formatCount;
	return (
		<Card id="overview-trend" className="@container/card min-w-0 gap-4 shadow-xs">
			<CardHeader className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3">
				<div className="flex flex-col gap-1">
					<h2 className="font-heading text-base font-semibold">{trendLabels[metric]} over time</h2>
					<CardDescription>
						{first && last && (
							<span>
								{dateLabel(first.date)}–{dateLabel(last.through)} ·{" "}
							</span>
						)}
						{weekly ? "Totals by 7-day period" : "Daily totals"}
					</CardDescription>
				</div>
				{controls}
			</CardHeader>
			<CardContent>
				<ChartPlot key={metric} points={points} metric={metric} format={format} />
			</CardContent>
		</Card>
	);
};
