import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { reportDate } from "./report-dates";
import type { OverviewRange, RevenuePoint } from "./overview.types";

type RevenueProps = { points: RevenuePoint[]; currency: string; range: OverviewRange };
type PlotProps = Pick<RevenueProps, "points" | "currency"> & {
	selected: string | undefined;
	onSelect: (date: string) => void;
};

const scale = (points: RevenuePoint[]) => {
	const max = Math.max(4, ...points.map((point) => point.sales));
	const step = 10 ** Math.floor(Math.log10(max));
	const top = Math.ceil(max / (step / 2)) * (step / 2);
	return [1, 0.75, 0.5, 0.25, 0].map((fraction) => Math.round(top * fraction));
};

const ChartGrid = ({ ticks, currency }: { ticks: number[]; currency: string }) => (
	<div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col justify-between">
		{ticks.map((amount) => (
			<div key={amount} className="flex h-0 items-center gap-3 text-[11px] text-muted-foreground">
				<span className="w-15 shrink-0 text-right tabular-nums">
					{formatMoney(amount, currency)}
				</span>
				<div className="w-full border-t border-dashed" />
			</div>
		))}
	</div>
);

type BarProps = Omit<PlotProps, "points"> & { point: RevenuePoint; max: number };

const PlotBar = ({ point, selected, onSelect, max, currency }: BarProps) => (
	<button
		type="button"
		aria-label={`${reportDate(point.date)}: ${formatMoney(point.sales, currency)}`}
		onFocus={() => onSelect(point.date)}
		onPointerEnter={() => onSelect(point.date)}
		onClick={() => onSelect(point.date)}
		className="flex min-w-0 flex-1 items-end justify-center rounded-sm px-px outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-0.75"
	>
		<span
			aria-hidden
			className={cn(
				"w-full max-w-12 rounded-t-[3px] bg-primary/65",
				selected === point.date && "bg-primary",
			)}
			style={{ height: `${(point.sales / max) * 100}%`, minHeight: point.sales ? 2 : 0 }}
		/>
	</button>
);

const RevenuePlot = ({ points, currency, selected, onSelect }: PlotProps) => {
	const ticks = scale(points);
	return (
		<div className="flex flex-col gap-3">
			<div className="relative h-44 pt-1 sm:h-52">
				<ChartGrid ticks={ticks} currency={currency} />
				<div className="relative ml-18 flex h-full">
					{points.map((point) => (
						<PlotBar
							key={point.date}
							point={point}
							max={ticks[0]}
							currency={currency}
							selected={selected}
							onSelect={onSelect}
						/>
					))}
				</div>
			</div>
			<div aria-hidden className="ml-18 flex justify-between text-xs text-muted-foreground">
				<span>{reportDate(points[0].date)}</span>
				<span>{reportDate(points[points.length - 1].date)}</span>
			</div>
		</div>
	);
};

export const RevenueChart = ({ points, currency, range }: RevenueProps) => {
	const [selection, select] = useState<string>();
	const point = points.find(({ date }) => date === selection);
	return (
		<Card size="sm" className="min-w-0 gap-6 p-4 sm:p-5">
			<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 px-0">
				<div className="flex flex-col gap-1">
					<h2 className="font-heading text-lg font-semibold">Sales over time</h2>
					<CardDescription>
						{range === 90 ? "Paid sales by 7-day period" : "Paid sales by day"}
					</CardDescription>
				</div>
				{point && (
					<p className="shrink-0 text-sm text-muted-foreground">
						{reportDate(point.date)} ·{" "}
						<strong className="text-foreground">{formatMoney(point.sales, currency)}</strong>
					</p>
				)}
			</CardHeader>
			<CardContent className="px-0 pt-1">
				<RevenuePlot points={points} currency={currency} selected={point?.date} onSelect={select} />
			</CardContent>
		</Card>
	);
};
