import { and, asc, eq } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db/client.server";
import { availableStock, products } from "@/db/schema/catalog";
import { requireStaff } from "@/features/auth/session.server";
import { lowStock } from "@/features/catalog/products.server";
import { orderWorkCounts, recentOrders } from "@/features/orders/orders.server";
import { getStoreSettings } from "@/features/settings/settings.server";
import { countOrderSyncFailures } from "@/features/store-integration/order-sync.server";
import { getAnalytics } from "./analytics.server";
import { overviewSearchSchema } from "./overview-validation";
import { buildTrend } from "./report-dates";

const watchStock = async () => {
	const where = and(eq(products.status, "active"), lowStock);
	const [rows, total] = await Promise.all([
		db
			.select({
				id: products.id,
				name: products.name,
				sku: products.sku,
				stock: availableStock,
			})
			.from(products)
			.where(where)
			.orderBy(asc(availableStock), asc(products.id))
			.limit(5),
		db.$count(products, where),
	]);
	return { rows, total };
};

export const readOverview = createServerFn()
	.validator(overviewSearchSchema)
	.handler(async ({ data }) => {
		await requireStaff();
		const { timeZone } = await getStoreSettings();
		const [analytics, orders, stock, work, syncFailures] = await Promise.all([
			getAnalytics(data.range, timeZone),
			recentOrders(),
			watchStock(),
			orderWorkCounts(),
			countOrderSyncFailures(),
		]);
		return {
			metrics: analytics.metrics,
			trend: buildTrend(analytics.rows, analytics.window),
			orders,
			stock,
			work: { ...work, syncFailures },
		};
	});
