import { and, desc, eq, getTableColumns, sql } from "drizzle-orm";
import { db } from "@/db/client.server";
import { alphabetical, orderBySort } from "@/db/sort.server";
import { user } from "@/db/schema/auth";
import { orderEvents, orderItems, orders, paymentEvents } from "@/db/schema/orders";
import { pageOffset, pageSize } from "@/lib/pagination";
import type { Sort } from "@/lib/sort";
import { ActionError } from "@/server/mutation.server";
import { canTransitionOrder } from "./order-options";
import type { OrderValues } from "./order.types";

const { importDigest: _, ...orderFields } = getTableColumns(orders);

export const findOrder = async (id: string) => {
	const [order] = await db.select(orderFields).from(orders).where(eq(orders.id, id));
	return order ? { order } : undefined;
};

const itemSortColumns = {
	id: orderItems.id,
	name: alphabetical(orderItems.name),
	quantity: orderItems.quantity,
	price: orderItems.unitPriceMinor,
	total: sql`${orderItems.quantity}::bigint * ${orderItems.unitPriceMinor}`,
};

export const listOrderItems = async (id: string, page: number, sort: Sort = "id.asc") => {
	const where = eq(orderItems.orderId, id);
	const [rows, total] = await Promise.all([
		db
			.select()
			.from(orderItems)
			.where(where)
			.orderBy(...orderBySort(itemSortColumns, sort, orderItems.id))
			.limit(pageSize)
			.offset(pageOffset(page)),
		db.$count(orderItems, where),
	]);
	return { rows, total };
};

const activitySortColumns = {
	date: orderEvents.createdAt,
	staff: alphabetical(sql`coalesce(${user.name}, 'System')`),
};

export const listOrderActivity = async (id: string, page: number, sort: Sort = "date.desc") => {
	const where = eq(orderEvents.orderId, id);
	const [rows, total] = await Promise.all([
		db
			.select({ event: orderEvents, staffName: user.name })
			.from(orderEvents)
			.leftJoin(user, eq(orderEvents.staffId, user.id))
			.where(where)
			.orderBy(...orderBySort(activitySortColumns, sort, orderEvents.id))
			.limit(pageSize)
			.offset(pageOffset(page)),
		db.$count(orderEvents, where),
	]);
	return { rows: rows.map(({ event, staffName }) => ({ ...event, staffName })), total };
};

export const listPaymentEvents = async (id: string, page: number) => {
	const where = eq(paymentEvents.orderId, id);
	const [rows, total] = await Promise.all([
		db
			.select()
			.from(paymentEvents)
			.where(where)
			.orderBy(desc(paymentEvents.recordedAt), desc(paymentEvents.id))
			.limit(pageSize)
			.offset(pageOffset(page)),
		db.$count(paymentEvents, where),
	]);
	return { rows, total };
};

export const saveOrder = ({ id, version, ...values }: OrderValues, staffId: string) =>
	db.transaction(async (transaction) => {
		const [current] = await transaction
			.select()
			.from(orders)
			.where(eq(orders.id, id))
			.for("update");
		if (!current) throw new ActionError("This order no longer exists.");
		if (current.updatedAt.toISOString() !== version)
			throw new ActionError("This order changed. Refresh before saving.");
		if (!canTransitionOrder(current.status, values.status))
			throw new ActionError("This status change is unavailable.");
		const updatedAt = new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1));
		await transaction
			.update(orders)
			.set({ ...values, updatedAt })
			.where(and(eq(orders.id, id), eq(orders.status, current.status)));
		if (values.status !== current.status) {
			await transaction.insert(orderEvents).values({
				orderId: id,
				staffId,
				previousStatus: current.status,
				status: values.status,
			});
		}
	});
