import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client.server";
import { availableStock, products } from "@/db/schema/catalog";
import { replenishmentAlerts } from "@/db/schema/inventory";
import { pageOffset, pageSize } from "@/lib/pagination";
import { ActionError } from "@/server/mutation.server";

const open = isNull(replenishmentAlerts.resolvedAt);
const unacknowledged = and(open, isNull(replenishmentAlerts.acknowledgedAt));

export const readReplenishmentAlerts = async (page: number, pendingOnly = false) => {
	const where = pendingOnly ? unacknowledged : open;
	const [rows, total] = await Promise.all([
		db
			.select({
				id: replenishmentAlerts.id,
				openedAt: replenishmentAlerts.openedAt,
				acknowledgedAt: replenishmentAlerts.acknowledgedAt,
				productId: products.id,
				name: products.name,
				sku: products.sku,
				availableStock,
				incomingStock: products.incomingStock,
				threshold: products.lowStockThreshold,
			})
			.from(replenishmentAlerts)
			.innerJoin(products, eq(replenishmentAlerts.productId, products.id))
			.where(where)
			.orderBy(asc(replenishmentAlerts.openedAt), asc(replenishmentAlerts.id))
			.limit(pageSize)
			.offset(pageOffset(page)),
		db.$count(replenishmentAlerts, where),
	]);
	return { rows, total };
};

export const countNewReplenishmentAlerts = () => db.$count(replenishmentAlerts, unacknowledged);

export const acknowledgeReplenishment = async (id: string, staffId: string) => {
	const [entry] = await db
		.update(replenishmentAlerts)
		.set({ acknowledgedAt: sql`now()`, acknowledgedBy: staffId })
		.where(and(eq(replenishmentAlerts.id, id), unacknowledged))
		.returning({ id: replenishmentAlerts.id });
	if (!entry)
		throw new ActionError("This replenishment alert has already changed. Refresh the list.");
};
