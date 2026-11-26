import { coerce as ZCoerce, iso as ZIso, literal as ZLiteral, object as ZObject } from "zod";
import type { output as ZOutput } from "zod";
import { daysBetween } from "./report-dates";

export const defaultRange = 30;
const date = ZIso.date().refine((value) => value >= "1900-01-01" && value <= "9999-12-30");

export const customReportRangeSchema = ZObject({ from: date, through: date }).refine(
	({ from, through }) => from <= through && daysBetween(from, through) < 366,
	"Choose a date range of up to 366 days with the start on or before the end.",
);

export const overviewSearchSchema = ZObject({
	range: ZCoerce.number<number>()
		.pipe(ZLiteral([7, 30, 90]))
		.catch(defaultRange)
		.default(defaultRange),
	from: date.optional().catch(undefined),
	through: date.optional().catch(undefined),
});

export type ReportSearch = ZOutput<typeof overviewSearchSchema>;

export const resolveReportRange = (search: ReportSearch) => {
	const custom = customReportRangeSchema.safeParse(search);
	return custom.success ? custom.data : search.range;
};
