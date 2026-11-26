import { and, gte, inArray, lt, sql, type SQLWrapper } from "drizzle-orm";
import { db } from "@/db/client.server";
import { customers } from "@/db/schema/customers";
import { orders, paymentEvents } from "@/db/schema/orders";
import { addDays, daysBetween, reportWindow } from "./report-dates";
import type { DateWindow, ReportRange } from "./overview.types";

const midnight = (date: string, timeZone: string) =>
	sql`(${date}::date::timestamp AT TIME ZONE ${timeZone})`;
const inWindow = (column: SQLWrapper, window: DateWindow) =>
	and(
		gte(column, midnight(window.from, window.timeZone)),
		lt(column, midnight(window.to, window.timeZone)),
	);

const localDate = (column: SQLWrapper, timeZone: string) =>
	sql<string>`to_char(${column} AT TIME ZONE ${timeZone}, 'YYYY-MM-DD')`.as("report_date");

const getPaymentTotals = (window: DateWindow) => {
	const date = localDate(paymentEvents.occurredAt, window.timeZone);
	return db
		.select({
			date,
			sales:
				sql`coalesce(sum(${paymentEvents.amountMinor}) filter (where ${paymentEvents.status} = 'paid'), 0)`.mapWith(
					Number,
				),
			refunds:
				sql`coalesce(sum(${paymentEvents.amountMinor}) filter (where ${paymentEvents.status} = 'refunded'), 0)`.mapWith(
					Number,
				),
			paidOrders: sql`count(*) filter (where ${paymentEvents.status} = 'paid')`.mapWith(Number),
		})
		.from(paymentEvents)
		.where(
			and(
				inArray(paymentEvents.status, ["paid", "refunded"]),
				inWindow(paymentEvents.occurredAt, window),
			),
		)
		.groupBy(date);
};

const getCountsByDay = (table: typeof orders | typeof customers, window: DateWindow) => {
	const date = localDate(table.createdAt, window.timeZone);
	return db
		.select({ date, count: sql`count(*)`.mapWith(Number) })
		.from(table)
		.where(inWindow(table.createdAt, window))
		.groupBy(date);
};

export const getAnalytics = async (range: ReportRange, timeZone: string, now = new Date()) => {
	const window = reportWindow(range, timeZone, now);
	const [daily, orderCounts, customerCounts] = await Promise.all([
		getPaymentTotals(window),
		getCountsByDay(orders, window),
		getCountsByDay(customers, window),
	]);
	const payments = new Map(daily.map((row) => [row.date, row]));
	const placed = new Map(orderCounts.map(({ date, count }) => [date, count]));
	const newCustomers = new Map(customerCounts.map(({ date, count }) => [date, count]));
	const rows = Array.from({ length: daysBetween(window.from, window.to) }, (_, offset) => {
		const date = addDays(window.from, offset);
		const { sales = 0, refunds = 0, paidOrders = 0 } = payments.get(date) ?? {};
		return {
			date,
			sales,
			refunds,
			net: sales - refunds,
			paidOrders,
			orders: placed.get(date) ?? 0,
			customers: newCustomers.get(date) ?? 0,
		};
	});
	const metrics = {
		sales: { current: 0, previous: 0 },
		refunds: { current: 0, previous: 0 },
		net: { current: 0, previous: 0 },
		paidOrders: { current: 0, previous: 0 },
		orders: { current: 0, previous: 0 },
		customers: { current: 0, previous: 0 },
	};
	for (const row of rows) {
		const interval = row.date < window.currentFrom ? "previous" : "current";
		for (const key of ["sales", "refunds", "net", "paidOrders", "orders", "customers"] as const) {
			metrics[key][interval] += row[key];
		}
	}
	const average = {
		current: metrics.paidOrders.current
			? Math.round(metrics.sales.current / metrics.paidOrders.current)
			: 0,
		previous: metrics.paidOrders.previous
			? Math.round(metrics.sales.previous / metrics.paidOrders.previous)
			: 0,
	};
	return { metrics: { ...metrics, average }, window, rows };
};
