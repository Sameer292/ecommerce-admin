import { createFileRoute } from "@tanstack/react-router";
import { getStaff } from "@/features/auth/session.server";
import { getAnalytics } from "@/features/overview/analytics.server";
import {
	customReportRangeSchema,
	overviewSearchSchema,
} from "@/features/overview/overview-validation";
import { addDays } from "@/features/overview/report-dates";
import { getStoreSettings } from "@/features/settings/settings.server";

export const Route = createFileRoute("/api/reports/sales")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				if (!(await getStaff())) return new Response("Sign in to export reports.", { status: 401 });
				const query = Object.fromEntries(new URL(request.url).searchParams);
				const custom =
					"from" in query || "through" in query
						? customReportRangeSchema.safeParse(query)
						: undefined;
				if (custom && !custom.success) {
					return new Response("Invalid reporting dates.", { status: 400 });
				}
				const { timeZone, currency } = await getStoreSettings();
				const range = custom?.data ?? overviewSearchSchema.parse(query).range;
				const { rows, window } = await getAnalytics(range, timeZone);
				const header =
					"period,date,time_zone,currency,paid_sales_minor,refunds_minor,net_minor,paid_orders,orders_placed,new_customers,average_paid_order_minor";
				const lines = rows.map(({ date, sales, refunds, net, paidOrders, orders, customers }) =>
					[
						date < window.currentFrom ? "previous" : "current",
						date,
						timeZone,
						currency,
						sales,
						refunds,
						net,
						paidOrders,
						orders,
						customers,
						paidOrders ? Math.round(sales / paidOrders) : 0,
					].join(","),
				);
				return new Response([header, ...lines, ""].join("\r\n"), {
					headers: {
						"Content-Type": "text/csv; charset=utf-8",
						"Content-Disposition": `attachment; filename="sales-${window.currentFrom}-${addDays(window.to, -1)}.csv"`,
						"Cache-Control": "private, no-store",
					},
				});
			},
		},
	},
});
