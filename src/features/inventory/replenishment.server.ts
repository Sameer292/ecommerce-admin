import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client.server";
import { availableStock, products } from "@/db/schema/catalog";
import { replenishmentAlerts } from "@/db/schema/inventory";
import { pageOffset, pageSize } from "@/lib/pagination";

const unacknowledged = and(
	isNull(replenishmentAlerts.resolvedAt),
	isNull(replenishmentAlerts.acknowledgedAt),
);

export const readReplenishmentAlerts = async (page: number) => {
	const [rows, total] = await Promise.all([
		db
			.select({
				id: replenishmentAlerts.id,
				openedAt: replenishmentAlerts.openedAt,
				productId: products.id,
				name: products.name,
				sku: products.sku,
				availableStock,
				incomingStock: products.incomingStock,
				threshold: products.lowStockThreshold,
			})
			.from(replenishmentAlerts)
			.innerJoin(products, eq(replenishmentAlerts.productId, products.id))
			.where(unacknowledged)
			.orderBy(asc(replenishmentAlerts.openedAt), asc(replenishmentAlerts.id))
			.limit(pageSize)
			.offset(pageOffset(page)),
		db.$count(replenishmentAlerts, unacknowledged),
	]);
	return { rows, total };
};
