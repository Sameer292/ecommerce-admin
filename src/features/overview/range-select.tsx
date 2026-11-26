import { useHydrated } from "@tanstack/react-router";
import { useState, type SubmitEvent } from "react";
import { buttonVariants, Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
	customReportRangeSchema,
	overviewSearchSchema,
	resolveReportRange,
	type ReportSearch,
} from "./overview-validation";
import { addDays } from "./report-dates";
import type { DateWindow } from "./overview.types";

export const RangeSelect = ({
	search,
	window,
	onChange,
}: {
	search: ReportSearch;
	window: DateWindow;
	onChange: (search: ReportSearch) => void;
}) => {
	const hydrated = useHydrated();
	const selected = resolveReportRange(search);
	const [showDates, setShowDates] = useState(typeof selected !== "number");
	const [error, setError] = useState("");
	const exportSearch = new URLSearchParams(
		typeof selected === "number" ? { range: String(selected) } : selected,
	);
	const applyDates = (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();
		const result = customReportRangeSchema.safeParse(
			Object.fromEntries(new FormData(event.currentTarget)),
		);
		if (!result.success) {
			setError("Choose a start and end date within 366 days of each other.");
			return;
		}
		setError("");
		onChange({ range: search.range, ...result.data });
	};
	return (
		<div className="flex flex-col items-start gap-2">
			<div className="flex flex-wrap gap-2">
				<NativeSelect
					value={showDates ? "custom" : search.range}
					disabled={!hydrated}
					aria-label="Reporting period"
					className="min-w-32"
					onChange={(event) => {
						const value = event.currentTarget.value;
						setShowDates(value === "custom");
						setError("");
						if (value !== "custom") onChange(overviewSearchSchema.parse({ range: value }));
					}}
				>
					<NativeSelectOption value={7}>Last 7 days</NativeSelectOption>
					<NativeSelectOption value={30}>Last 30 days</NativeSelectOption>
					<NativeSelectOption value={90}>Last 90 days</NativeSelectOption>
					<NativeSelectOption value="custom">Custom dates</NativeSelectOption>
				</NativeSelect>
				<a
					href={`/api/reports/sales?${exportSearch}`}
					className={buttonVariants({ variant: "outline" })}
				>
					Download CSV
				</a>
			</div>
			{showDates && (
				<form className="flex flex-wrap items-end gap-2" onSubmit={applyDates}>
					<div className="grid gap-1">
						<Label htmlFor="report-from">Start date</Label>
						<Input
							id="report-from"
							type="date"
							name="from"
							required
							min="1900-01-01"
							defaultValue={window.currentFrom}
						/>
					</div>
					<div className="grid gap-1">
						<Label htmlFor="report-through">End date</Label>
						<Input
							id="report-through"
							type="date"
							name="through"
							required
							min="1900-01-01"
							defaultValue={addDays(window.to, -1)}
						/>
					</div>
					<Button type="submit" disabled={!hydrated}>
						Apply
					</Button>
					{error && (
						<p className="w-full text-sm text-destructive" role="alert">
							{error}
						</p>
					)}
				</form>
			)}
		</div>
	);
};
