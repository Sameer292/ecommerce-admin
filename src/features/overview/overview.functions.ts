import { and, asc, eq } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db/client.server";
import { products } from "@/db/schema/catalog";
import { requireStaff } from "@/features/auth/session.server";
import { lowStock } from "@/features/catalog/products.server";
import { recentOrders } from "@/features/orders/orders.server";
import { getStoreSettings } from "@/features/settings/settings.server";
import { getAnalytics } from "./analytics.server";
import { overviewSearchSchema } from "./overview-validation";

const watchStock = () =>
	db
		.select({
			id: products.id,
			name: products.name,
			sku: products.sku,
			stock: products.stock,
			lowStockThreshold: products.lowStockThreshold,
		})
		.from(products)
		.where(and(eq(products.status, "active"), lowStock))
		.orderBy(asc(products.stock), asc(products.id))
		.limit(5);

export const readOverview = createServerFn()
	.validator(overviewSearchSchema)
	.handler(async ({ data }) => {
		await requireStaff();
		const { timeZone } = await getStoreSettings();
		const [analytics, orders, stock] = await Promise.all([
			getAnalytics(data.range, timeZone),
			recentOrders(),
			watchStock(),
		]);
		return { ...analytics, orders, stock };
	});
