import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client.server";
import { orders } from "@/db/schema/orders";
import { orderSync } from "@/db/schema/store-sync";
import { pageOffset, pageSize, type ListPageSize } from "@/lib/pagination";
import { logRequestFailure } from "@/server/request-diagnostics.server";
import { IntegrationError } from "./integration-request.server";

const recordSync = async (
	orderNumber: string,
	operation: "import" | "payment",
	status: number,
	attemptedAt: Date,
) => {
	try {
		await db
			.insert(orderSync)
			.values({ orderNumber, operation, status, attemptedAt })
			.onConflictDoUpdate({
				target: [orderSync.orderNumber, orderSync.operation],
				set: { status, attemptedAt },
				setWhere: sql`${orderSync.attemptedAt} <= ${attemptedAt.toISOString()}::timestamptz`,
			});
	} catch (error) {
		logRequestFailure("record storefront synchronization status", error);
	}
};

export const trackOrderSync = async (
	orderNumber: string,
	operation: "import" | "payment",
	action: () => Promise<Response>,
) => {
	const attemptedAt = new Date();
	try {
		const response = await action();
		await recordSync(orderNumber, operation, response.status, attemptedAt);
		return response;
	} catch (error) {
		await recordSync(
			orderNumber,
			operation,
			error instanceof IntegrationError ? error.status : 500,
			attemptedAt,
		);
		throw error;
	}
};

const failed = sql`${orderSync.status} >= 400`;

export const countOrderSyncFailures = () => db.$count(orderSync, failed);

export const listOrderSyncFailures = async (page: number, size: ListPageSize = pageSize) => {
	const [rows, total] = await Promise.all([
		db
			.select({
				orderNumber: orderSync.orderNumber,
				orderId: orders.id,
				operation: orderSync.operation,
				status: orderSync.status,
				attemptedAt: orderSync.attemptedAt,
			})
			.from(orderSync)
			.leftJoin(orders, eq(orderSync.orderNumber, orders.number))
			.where(failed)
			.orderBy(desc(orderSync.attemptedAt), orderSync.orderNumber, orderSync.operation)
			.limit(size)
			.offset(pageOffset(page, size)),
		countOrderSyncFailures(),
	]);
	return { rows, total };
};
