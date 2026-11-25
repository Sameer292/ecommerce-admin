import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db/client.server";
import { orderEvents, orderItems, orderReturns, orders, shipmentItems } from "@/db/schema/orders";
import { adjustStockInTransaction } from "@/features/inventory/inventory.server";
import { ActionError } from "@/server/mutation.server";
import type { ReturnValues } from "./return-validation";
import { hasOrderShipment } from "./shipments.server";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const listOrderReturns = async (orderId: string) => {
	const [returns, items] = await Promise.all([
		db
			.select({
				record: orderReturns,
				item: { name: orderItems.name, sku: orderItems.sku, productId: orderItems.productId },
			})
			.from(orderReturns)
			.innerJoin(orderItems, eq(orderItems.id, orderReturns.itemId))
			.where(eq(orderReturns.orderId, orderId))
			.orderBy(desc(orderReturns.createdAt), desc(orderReturns.id)),
		db
			.select({
				id: orderItems.id,
				name: orderItems.name,
				sku: orderItems.sku,
				quantity: orderItems.quantity,
			})
			.from(orderItems)
			.where(eq(orderItems.orderId, orderId))
			.orderBy(orderItems.name, orderItems.id),
	]);
	return { returns, items };
};

const requestReturn = async (
	transaction: Transaction,
	order: typeof orders.$inferSelect,
	input: Extract<ReturnValues, { action: "request" }>,
	staffId: string,
) => {
	const [item] = await transaction
		.select()
		.from(orderItems)
		.where(and(eq(orderItems.id, input.itemId), eq(orderItems.orderId, order.id)));
	if (!item) throw new ActionError("Choose an item from this order.", "itemId");

	const [dispatched] = await transaction
		.select({
			total: sql<number>`coalesce(sum(${shipmentItems.quantity}), 0)`.mapWith(Number),
		})
		.from(shipmentItems)
		.where(eq(shipmentItems.itemId, item.id));
	const [claimed] = await transaction
		.select({
			total: sql<number>`coalesce(sum(${orderReturns.quantity}), 0)`.mapWith(Number),
		})
		.from(orderReturns)
		.where(and(eq(orderReturns.itemId, item.id), ne(orderReturns.status, "rejected")));
	const tracked = dispatched.total > 0 || (await hasOrderShipment(transaction, order.id));
	const shipped = tracked
		? dispatched.total
		: order.status === "shipped" || order.status === "delivered"
			? item.quantity
			: 0;
	if (input.quantity > shipped - claimed.total)
		throw new ActionError(
			"This exceeds the dispatched quantity still available to return.",
			"quantity",
		);

	await transaction.insert(orderReturns).values({
		id: input.id,
		orderId: order.id,
		itemId: item.id,
		quantity: input.quantity,
		reason: input.reason,
		requestedBy: staffId,
		updatedBy: staffId,
	});
};

export const writeReturn = (input: ReturnValues, staffId: string) =>
	db.transaction(async (transaction) => {
		const [order] = await transaction
			.select()
			.from(orders)
			.where(eq(orders.id, input.orderId))
			.for("update");
		if (!order) throw new ActionError("This order no longer exists.");
		const [record] = await transaction
			.select()
			.from(orderReturns)
			.where(eq(orderReturns.id, input.id));
		if (record && record.orderId !== order.id)
			throw new ActionError("This return belongs to a different order.");
		if (input.action === "request") {
			if (record) {
				if (
					record.itemId !== input.itemId ||
					record.quantity !== input.quantity ||
					record.reason !== input.reason
				)
					throw new ActionError("This return was already requested with different details.");
				return;
			}
			await requestReturn(transaction, order, input, staffId);
			return;
		}
		if (!record) throw new ActionError("This return no longer exists.");
		const next =
			input.action === "approve" ? "approved" : input.action === "reject" ? "rejected" : "received";
		const received = input.action === "receive";
		if (record.status === next || (received && record.status === "refunded")) {
			if (received && record.restocked !== input.restock)
				throw new ActionError(
					"This return was already received with a different restocking choice.",
				);
			return;
		}
		if (record.status !== (received ? "approved" : "requested"))
			throw new ActionError("This return changed. Refresh to see its current status.");

		const restocked = received && input.restock;
		if (restocked) {
			const [item] = await transaction
				.select({ productId: orderItems.productId })
				.from(orderItems)
				.where(eq(orderItems.id, record.itemId));
			if (!item?.productId) throw new ActionError("This SKU has no product to restock.");
			await adjustStockInTransaction(transaction, {
				id: record.id,
				productId: item.productId,
				delta: record.quantity,
				reason: `Return ${record.id}`,
				reference: record.id,
				staffId,
			});
		}
		await transaction
			.update(orderReturns)
			.set({ status: next, restocked, updatedBy: staffId, updatedAt: new Date() })
			.where(eq(orderReturns.id, record.id));
		await transaction.insert(orderEvents).values({
			orderId: order.id,
			staffId,
			previousStatus: order.status,
			status: order.status,
			fields: [restocked ? "Return received and restocked" : `Return ${next}`],
		});
	});
