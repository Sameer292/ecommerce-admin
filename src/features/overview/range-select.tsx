import { useHydrated } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { overviewSearchSchema } from "./overview-validation";
import type { OverviewRange } from "./overview.types";

const ranges = [
	{ value: "7", label: "Last 7 days" },
	{ value: "30", label: "Last 30 days" },
	{ value: "90", label: "Last 90 days" },
];

export const RangeSelect = ({
	range,
	onChange,
}: {
	range: OverviewRange;
	onChange: (range: OverviewRange) => void;
}) => {
	const hydrated = useHydrated();
	const value = String(range);
	const selectRange = (next: string | null | undefined) => {
		if (next) onChange(overviewSearchSchema.parse({ range: next }).range);
	};
	return (
		<div className="flex flex-wrap gap-2">
			<ToggleGroup
				aria-label="Reporting period"
				className="hidden @[780px]/card:flex"
				value={[value]}
				variant="outline"
				spacing={0}
				disabled={!hydrated}
				onValueChange={([next]) => selectRange(next)}
			>
				{ranges.map(({ value, label }) => (
					<ToggleGroupItem key={value} value={value}>
						{label}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
			<Select value={value} items={ranges} disabled={!hydrated} onValueChange={selectRange}>
				<SelectTrigger aria-label="Reporting period" className="min-w-32 @[780px]/card:hidden">
					<SelectValue />
				</SelectTrigger>
				<SelectContent alignItemWithTrigger={false}>
					<SelectGroup>
						{ranges.map(({ value, label }) => (
							<SelectItem key={value} value={value}>
								{label}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
			<a
				href={`/api/reports/sales?range=${range}`}
				className={buttonVariants({ variant: "outline" })}
			>
				Download CSV
			</a>
		</div>
	);
};
