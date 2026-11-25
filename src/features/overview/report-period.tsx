import { formatDate } from "@/lib/format";
import { addDays } from "./report-dates";
import type { DateWindow } from "./overview.types";

const dateLabel = (date: string) => formatDate(new Date(`${date}T00:00:00Z`), "UTC");

export const ReportPeriod = ({ window }: { window: DateWindow }) => {
	const { from, currentFrom, to, timeZone, today } = window;
	return (
		<div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
			<p>
				<strong className="text-foreground">Current</strong> {dateLabel(currentFrom)}–
				{dateLabel(addDays(to, -1))}
			</p>
			<p>
				<strong className="text-foreground">Previous</strong> {dateLabel(from)}–
				{dateLabel(addDays(currentFrom, -1))}
			</p>
			<p>
				{timeZone}
				{currentFrom <= today && today < to ? " · Today is still in progress" : ""}
			</p>
		</div>
	);
};
