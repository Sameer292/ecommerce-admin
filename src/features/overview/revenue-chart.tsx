import { useState, type PointerEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { reportDate } from "./report-dates";
import type { OverviewRange, RevenuePoint } from "./overview.types";

type RevenueProps = { points: RevenuePoint[]; currency: string; range: OverviewRange };
type PlotProps = Pick<RevenueProps, "points" | "currency"> & {
	selected: number;
	onSelect: (index: number) => void;
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

const PlotBar = ({
	point,
	selected,
	max,
}: {
	point: RevenuePoint;
	selected: boolean;
	max: number;
}) => (
	<div className="flex min-w-0 flex-1 items-end justify-center px-px sm:px-0.75">
		<span
			className={cn("w-full max-w-12 rounded-t-[3px] bg-primary/65", selected && "bg-primary")}
			style={{ height: `${(point.sales / max) * 100}%`, minHeight: point.sales ? 2 : 0 }}
		/>
	</div>
);

const RevenuePlot = ({ points, currency, selected, onSelect }: PlotProps) => {
	const ticks = scale(points);
	const selectPointer = (event: PointerEvent<HTMLInputElement>) => {
		const { left, width } = event.currentTarget.getBoundingClientRect();
		const index = Math.floor(((event.clientX - left) / width) * points.length);
		onSelect(Math.min(points.length - 1, Math.max(0, index)));
	};
	const point = points[selected];
	return (
		<div className="flex flex-col gap-3">
			<div className="relative h-44 pt-1 sm:h-52">
				<ChartGrid ticks={ticks} currency={currency} />
				<div className="relative ml-18 flex h-full rounded-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
					<div className="flex size-full" aria-hidden>
						{points.map((point, index) => (
							<PlotBar
								key={point.date}
								point={point}
								max={ticks[0]}
								selected={index === selected}
							/>
						))}
					</div>
					<input
						type="range"
						min={0}
						max={points.length - 1}
						value={selected}
						aria-label="Chart date"
						aria-valuetext={`${reportDate(point.date)}, ${formatMoney(point.sales, currency)}`}
						className="absolute inset-0 size-full touch-pan-y cursor-pointer opacity-0"
						onChange={(event) => onSelect(Number(event.currentTarget.value))}
						onPointerDown={(event) => {
							event.preventDefault();
							event.currentTarget.focus({ preventScroll: true });
							selectPointer(event);
						}}
						onPointerMove={(event) => {
							if (event.pointerType === "mouse" || event.buttons === 1) selectPointer(event);
						}}
					/>
				</div>
			</div>
			<div aria-hidden className="ml-18 flex justify-between text-xs text-muted-foreground">
				<span>{reportDate(points[0].date)}</span>
				<span>{reportDate(points[points.length - 1].date)}</span>
			</div>
		</div>
	);
};

const RevenueData = ({ points, currency }: Pick<RevenueProps, "points" | "currency">) => (
	<details className="mt-4 text-sm">
		<summary className="cursor-pointer font-medium">View sales data</summary>
		<Table>
			<TableCaption className="sr-only">Paid sales over time</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead scope="col">Date</TableHead>
					<TableHead scope="col" className="text-right">
						Paid sales
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{points.map(({ date, sales }) => (
					<TableRow key={date}>
						<TableCell>{reportDate(date)}</TableCell>
						<TableCell className="text-right tabular-nums">
							{formatMoney(sales, currency)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	</details>
);

export const RevenueChart = ({ points, currency, range }: RevenueProps) => {
	const [selection, select] = useState(0);
	const selected = Math.min(selection, points.length - 1);
	const point = points[selected];
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
				<RevenuePlot points={points} currency={currency} selected={selected} onSelect={select} />
				<RevenueData points={points} currency={currency} />
			</CardContent>
		</Card>
	);
};
