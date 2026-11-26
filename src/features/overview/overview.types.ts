import type { output as ZOutput } from "zod";
import type { customReportRangeSchema, overviewSearchSchema } from "./overview-validation";

export type OverviewRange = ZOutput<typeof overviewSearchSchema>["range"];
export type ReportRange = OverviewRange | ZOutput<typeof customReportRangeSchema>;
export type DateWindow = {
	from: string;
	currentFrom: string;
	to: string;
	timeZone: string;
	today: string;
};
export type Comparison = { current: number; previous: number };
export type TrendMetric = "orders" | "sales" | "customers";
export type TrendDay = { date: string } & Record<TrendMetric, number>;
export type TrendPoint = TrendDay & {
	through: string;
	partial: boolean;
};
export type DashboardMetrics = {
	sales: Comparison;
	paidOrders: Comparison;
	refunds: Comparison;
	net: Comparison;
	orders: Comparison;
	average: Comparison;
	customers: Comparison;
};
