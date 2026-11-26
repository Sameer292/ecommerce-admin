import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@/components/ui/chart";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatCount, formatMoney } from "@/lib/format";
import { trendLabels } from "./metric-cards";
import type { TrendMetric, TrendPoint } from "./overview.types";
import { reportDate } from "./report-dates";

type ChartProps = { points: TrendPoint[]; currency: string; metric: TrendMetric };
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

const ChartPlot = ({ points, metric, format }: SeriesProps) => (
	<ChartContainer
		config={chartConfig}
		className="aspect-auto h-36 w-full rounded-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring sm:h-52 lg:h-64"
	>
		<LineChart
			accessibilityLayer
			aria-label={`${trendLabels[metric]} over time`}
			data={points}
			margin={{ top: 8, right: 12, left: 0 }}
		>
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
			<Line
				dataKey={metric}
				type="monotone"
				stroke={`var(--color-${metric})`}
				strokeWidth={2.5}
				dot={points.length === 1}
				activeDot={{ r: 5, stroke: "var(--card)" }}
				isAnimationActive={false}
			/>
		</LineChart>
	</ChartContainer>
);

const ChartData = ({ points, metric, format }: SeriesProps) => (
	<details className="mt-3 text-sm sm:mt-4">
		<summary className="cursor-pointer font-medium">View chart data</summary>
		<Table>
			<TableCaption className="sr-only">{trendLabels[metric]} over time</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead scope="col">Period</TableHead>
					<TableHead scope="col" className="text-right">
						{trendLabels[metric]}
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{points.map((point) => (
					<TableRow key={point.date}>
						<TableCell>{periodLabel(point)}</TableCell>
						<TableCell className="text-right tabular-nums">{format(point[metric])}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	</details>
);

export const TrendChart = ({ points, currency, metric }: ChartProps) => {
	const weekly = points.some(({ date, through }) => date !== through);
	const format =
		metric === "sales" ? (amount: number) => formatMoney(amount, currency) : formatCount;
	return (
		<Card id="overview-trend" size="sm" className="min-w-0 gap-3 p-3 sm:gap-5 sm:p-5">
			<CardHeader className="px-0">
				<h2 className="font-heading text-lg font-semibold">{trendLabels[metric]} over time</h2>
				<CardDescription>{weekly ? "Totals by 7-day period" : "Daily totals"}</CardDescription>
			</CardHeader>
			<CardContent className="px-0 pt-1">
				<ChartPlot key={metric} points={points} metric={metric} format={format} />
				<ChartData points={points} metric={metric} format={format} />
			</CardContent>
		</Card>
	);
};
