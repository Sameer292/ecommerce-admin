import { and, gte, inArray, lt, sql, type SQLWrapper } from "drizzle-orm";
import { db } from "@/db/client.server";
import { customers } from "@/db/schema/customers";
import { orders, paymentEvents } from "@/db/schema/orders";
import { buildTrend, reportWindow } from "./report-dates";
import type { Comparison, DailySales, DateWindow, OverviewRange } from "./overview.types";

const midnight = (date: string, timeZone: string) =>
	sql`(${date}::date::timestamp AT TIME ZONE ${timeZone})`;
const inWindow = (column: SQLWrapper, window: DateWindow) =>
	and(
		gte(column, midnight(window.from, window.timeZone)),
		lt(column, midnight(window.to, window.timeZone)),
	);

const compareCounts = (column: SQLWrapper, window: DateWindow) => {
	const pivot = midnight(window.currentFrom, window.timeZone);
	return {
		current: sql`count(*) filter (where ${column} >= ${pivot})`.mapWith(Number),
		previous: sql`count(*) filter (where ${column} < ${pivot})`.mapWith(Number),
	};
};

const getPaymentTotals = (window: DateWindow) => {
	const localDate =
		sql<string>`to_char(${paymentEvents.occurredAt} AT TIME ZONE ${window.timeZone}, 'YYYY-MM-DD')`.as(
			"sales_date",
		);
	return db
		.select({
			date: localDate,
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
		.groupBy(localDate);
};

const salesComparison = (sales: DailySales[], pivot: string) => {
	const totals = {
		sales: { current: 0, previous: 0 },
		refunds: { current: 0, previous: 0 },
		paidOrders: { current: 0, previous: 0 },
	};
	for (const row of sales) {
		const interval = row.date < pivot ? "previous" : "current";
		totals.sales[interval] += row.sales;
		totals.refunds[interval] += row.refunds;
		totals.paidOrders[interval] += row.paidOrders;
	}
	return totals;
};

const average = (sales: Comparison, counts: Comparison) => ({
	current: counts.current ? Math.round(sales.current / counts.current) : 0,
	previous: counts.previous ? Math.round(sales.previous / counts.previous) : 0,
});

export const getAnalytics = async (range: OverviewRange, timeZone: string, now = new Date()) => {
	const window = reportWindow(range, timeZone, now);
	const [daily, [orderCounts], [customerCounts]] = await Promise.all([
		getPaymentTotals(window),
		db
			.select(compareCounts(orders.createdAt, window))
			.from(orders)
			.where(inWindow(orders.createdAt, window)),
		db
			.select(compareCounts(customers.createdAt, window))
			.from(customers)
			.where(inWindow(customers.createdAt, window)),
	]);
	const totals = salesComparison(daily, window.currentFrom);
	const revenue = new Map(daily.map((row) => [row.date, row.sales]));
	return {
		metrics: {
			sales: totals.sales,
			paidOrders: totals.paidOrders,
			refunds: totals.refunds,
			net: {
				current: totals.sales.current - totals.refunds.current,
				previous: totals.sales.previous - totals.refunds.previous,
			},
			orders: orderCounts,
			customers: customerCounts,
			average: average(totals.sales, totals.paidOrders),
		},
		trend: buildTrend(revenue, window, range),
		window,
	};
};
