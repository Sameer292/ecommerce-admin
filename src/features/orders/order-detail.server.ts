import { and, desc, eq, getTableColumns, inArray, sql } from "drizzle-orm";
import { setAuditActor } from "@/db/audit-actor.server";
import { db } from "@/db/client.server";
import { alphabetical, orderBySort } from "@/db/sort.server";
import { user } from "@/db/schema/auth";
import {
	orderEvents,
	orderItems,
	orderNotifications,
	orders,
	paymentEvents,
} from "@/db/schema/orders";
import { pageOffset, pageSize, type ListPageSize } from "@/lib/pagination";
import type { Sort } from "@/lib/sort";
import { ActionError } from "@/server/mutation.server";
import {
	canChangePaymentCollection,
	canCorrectDelivery,
	canTransitionOrder,
	fulfillmentPaymentProblem,
} from "./order-options";
import type { OrderValues } from "./order.types";
import { hasOrderShipment } from "./shipments.server";

const { importDigest: _, ...orderFields } = getTableColumns(orders);

export const findOrder = async (id: string) => {
	const [order] = await db.select(orderFields).from(orders).where(eq(orders.id, id));
	return order ? { order } : undefined;
};

export const findOrderDocuments = async (ids: string[]) => {
	if (!ids.length) return [];
	const [details, items] = await Promise.all([
		db.select(orderFields).from(orders).where(inArray(orders.id, ids)),
		db
			.select()
			.from(orderItems)
			.where(inArray(orderItems.orderId, ids))
			.orderBy(orderItems.name, orderItems.id),
	]);
	const indexed = new Map(details.map((order) => [order.id, order]));
	return ids.flatMap((id) => {
		const order = indexed.get(id);
		return order ? [{ order, items: items.filter((item) => item.orderId === id) }] : [];
	});
};

const itemSortColumns = {
	id: orderItems.id,
	name: alphabetical(orderItems.name),
	quantity: orderItems.quantity,
	price: orderItems.unitPriceMinor,
	total: sql`${orderItems.quantity}::bigint * ${orderItems.unitPriceMinor}`,
};

export const listOrderItems = async (
	id: string,
	page: number,
	sort: Sort = "id.asc",
	size: ListPageSize = pageSize,
) => {
	const where = eq(orderItems.orderId, id);
	const [rows, total] = await Promise.all([
		db
			.select()
			.from(orderItems)
			.where(where)
			.orderBy(...orderBySort(itemSortColumns, sort, orderItems.id))
			.limit(size)
			.offset(pageOffset(page, size)),
		db.$count(orderItems, where),
	]);
	return { rows, total };
};

const activitySortColumns = {
	date: orderEvents.createdAt,
	staff: alphabetical(sql`coalesce(${user.name}, 'System')`),
};

export const listOrderActivity = async (
	id: string,
	page: number,
	sort: Sort = "date.desc",
	size: ListPageSize = pageSize,
) => {
	const where = eq(orderEvents.orderId, id);
	const [rows, total] = await Promise.all([
		db
			.select({ event: orderEvents, staffName: user.name })
			.from(orderEvents)
			.leftJoin(user, eq(orderEvents.staffId, user.id))
			.where(where)
			.orderBy(...orderBySort(activitySortColumns, sort, orderEvents.id))
			.limit(size)
			.offset(pageOffset(page, size)),
		db.$count(orderEvents, where),
	]);
	return { rows: rows.map(({ event, staffName }) => ({ ...event, staffName })), total };
};

export const listPaymentEvents = async (
	id: string,
	page: number,
	size: ListPageSize = pageSize,
) => {
	const where = eq(paymentEvents.orderId, id);
	const [rows, total] = await Promise.all([
		db
			.select()
			.from(paymentEvents)
			.where(where)
			.orderBy(desc(paymentEvents.recordedAt), desc(paymentEvents.id))
			.limit(size)
			.offset(pageOffset(page, size)),
		db.$count(paymentEvents, where),
	]);
	return { rows, total };
};

export const saveOrder = (
	{
		id,
		version,
		cashOnDelivery,
		shippingName,
		shippingAddress,
		deliveryReason,
		...values
	}: OrderValues,
	staffId: string,
) =>
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
		const collection = cashOnDelivery ?? current.cashOnDelivery;
		if (
			collection !== current.cashOnDelivery &&
			!canChangePaymentCollection(current.status, current.paymentStatus)
		) {
			throw new ActionError(
				"Payment collection can only change before dispatch while the order is unpaid.",
				"cashOnDelivery",
			);
		}
		const problem = fulfillmentPaymentProblem(
			current.status,
			values.status,
			current.paymentStatus,
			collection,
		);
		if (problem) throw new ActionError(problem, "status");
		const delivery = {
			shippingName: shippingName ?? current.shippingName,
			shippingAddress: shippingAddress ?? current.shippingAddress,
		};
		const fields = [];
		if (delivery.shippingName !== current.shippingName) fields.push("Recipient");
		if (delivery.shippingAddress !== current.shippingAddress) fields.push("Shipping address");
		const deliveryChanged = fields.length > 0;
		if (deliveryChanged && !canCorrectDelivery(current.status))
			throw new ActionError("Delivery details can only change before dispatch.");
		if (
			(deliveryChanged || collection !== current.cashOnDelivery) &&
			(await hasOrderShipment(transaction, id))
		)
			throw new ActionError(
				"Delivery details and payment collection are locked after the first package dispatch.",
			);
		if (deliveryChanged && !deliveryReason)
			throw new ActionError("Enter a reason for the delivery correction.", "deliveryReason");
		if (values.notes !== current.notes) fields.push("Internal notes");
		if (values.trackingNumber !== current.trackingNumber) fields.push("Tracking number");
		if (collection !== current.cashOnDelivery) fields.push("Payment collection");
		if (!fields.length && values.status === current.status) return;
		const updatedAt = new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1));
		await setAuditActor(transaction, staffId);
		await transaction
			.update(orders)
			.set({ ...values, ...delivery, cashOnDelivery: collection, updatedAt })
			.where(and(eq(orders.id, id), eq(orders.status, current.status)));
		if (values.status !== current.status || fields.length > 0) {
			await transaction.insert(orderEvents).values({
				orderId: id,
				staffId,
				previousStatus: current.status,
				status: values.status,
				fields,
				reason: deliveryChanged ? deliveryReason : undefined,
			});
		}
		if (values.status !== current.status && ["shipped", "cancelled"].includes(values.status)) {
			await transaction.insert(orderNotifications).values({
				orderId: id,
				kind: values.status === "shipped" ? "shipping" : "cancellation",
				payload: values.status === "shipped" ? { trackingNumber: values.trackingNumber } : {},
			});
		}
	});
