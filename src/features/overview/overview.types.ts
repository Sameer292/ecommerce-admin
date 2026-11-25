import type { output as ZOutput } from "zod";
import type { overviewSearchSchema } from "./overview-validation";

export type OverviewRange = ZOutput<typeof overviewSearchSchema>["range"];
export type DateWindow = {
	from: string;
	currentFrom: string;
	to: string;
	timeZone: string;
	today: string;
};
export type Comparison = { current: number; previous: number };
export type DailySales = { date: string; sales: number; refunds: number; paidOrders: number };
export type RevenuePoint = Pick<DailySales, "date" | "sales">;
export type DashboardMetrics = {
	sales: Comparison;
	paidOrders: Comparison;
	refunds: Comparison;
	net: Comparison;
	orders: Comparison;
	average: Comparison;
	customers: Comparison;
};
