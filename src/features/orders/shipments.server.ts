import { desc, eq, sql } from "drizzle-orm";
import { setAuditActor } from "@/db/audit-actor.server";
import { db } from "@/db/client.server";
import {
	orderEvents,
	orderItems,
	orderNotifications,
	orders,
	orderShipments,
	shipmentItems,
} from "@/db/schema/orders";
import { ActionError } from "@/server/mutation.server";
import { fulfillmentPaymentProblem } from "./order-options";
import type { ShipmentValues } from "./shipment-validation";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const hasOrderShipment = async (transaction: Transaction, orderId: string) => {
	const [shipment] = await transaction
		.select({ id: orderShipments.id })
		.from(orderShipments)
		.where(eq(orderShipments.orderId, orderId))
		.limit(1);
	return Boolean(shipment);
};

const shipmentLines = (reader: typeof db | Transaction, orderId: string) =>
	reader
		.select({
			id: orderItems.id,
			name: orderItems.name,
			sku: orderItems.sku,
			remaining:
				sql<number>`(${orderItems.quantity} - coalesce(sum(${shipmentItems.quantity}), 0))::integer`.mapWith(
					Number,
				),
		})
		.from(orderItems)
		.leftJoin(shipmentItems, eq(shipmentItems.itemId, orderItems.id))
		.where(eq(orderItems.orderId, orderId))
		.groupBy(orderItems.id)
		.orderBy(orderItems.name, orderItems.id);

export const listOrderShipments = async (orderId: string) => {
	const [shipments, packages, remaining] = await Promise.all([
		db
			.select()
			.from(orderShipments)
			.where(eq(orderShipments.orderId, orderId))
			.orderBy(desc(orderShipments.dispatchedAt), desc(orderShipments.id)),
		db
			.select({
				shipmentId: shipmentItems.shipmentId,
				itemId: shipmentItems.itemId,
				name: orderItems.name,
				sku: orderItems.sku,
				quantity: shipmentItems.quantity,
			})
			.from(shipmentItems)
			.innerJoin(orderShipments, eq(orderShipments.id, shipmentItems.shipmentId))
			.innerJoin(orderItems, eq(orderItems.id, shipmentItems.itemId))
			.where(eq(orderShipments.orderId, orderId)),
		shipmentLines(db, orderId),
	]);
	const grouped = new Map<string, typeof packages>();
	for (const item of packages) {
		const shipment = grouped.get(item.shipmentId);
		if (shipment) shipment.push(item);
		else grouped.set(item.shipmentId, [item]);
	}
	return {
		shipments: shipments.map((item) => ({ ...item, items: grouped.get(item.id) ?? [] })),
		remaining: remaining.filter((line) => line.remaining > 0),
	};
};

export const saveShipment = ({ version, lines, ...shipment }: ShipmentValues, staffId: string) =>
	db.transaction(async (transaction) => {
		const [order] = await transaction
			.select()
			.from(orders)
			.where(eq(orders.id, shipment.orderId))
			.for("update");
		if (!order) throw new ActionError("This order no longer exists.");
		const [existing] = await transaction
			.select()
			.from(orderShipments)
			.where(eq(orderShipments.id, shipment.id));
		if (existing) {
			const previous = await transaction
				.select({ itemId: shipmentItems.itemId, quantity: shipmentItems.quantity })
				.from(shipmentItems)
				.where(eq(shipmentItems.shipmentId, shipment.id));
			const quantities = new Map(previous.map(({ itemId, quantity }) => [itemId, quantity]));
			if (
				existing.orderId !== shipment.orderId ||
				existing.carrier !== shipment.carrier ||
				existing.service !== shipment.service ||
				existing.trackingNumber !== shipment.trackingNumber ||
				existing.trackingUrl !== shipment.trackingUrl ||
				previous.length !== lines.length ||
				lines.some(({ itemId, quantity }) => quantities.get(itemId) !== quantity)
			) {
				throw new ActionError(
					"This package was already recorded with different details. Refresh first.",
				);
			}
			return;
		}
		if (order.updatedAt.toISOString() !== version)
			throw new ActionError("This order changed. Refresh before recording the package.");
		if (order.status !== "processing" && order.status !== "shipped") {
			throw new ActionError("Set the order to Processing before recording a dispatch.");
		}
		const problem = fulfillmentPaymentProblem(
			"processing",
			"shipped",
			order.paymentStatus,
			order.cashOnDelivery,
		);
		if (problem) throw new ActionError(problem);
		const unshipped = await shipmentLines(transaction, order.id);
		const remaining = new Map(unshipped.map(({ id, remaining }) => [id, remaining]));
		const requested = new Map(lines.map(({ itemId, quantity }) => [itemId, quantity]));
		if (lines.some(({ itemId, quantity }) => quantity > (remaining.get(itemId) ?? 0))) {
			throw new ActionError("One or more quantities exceed the units available to dispatch.");
		}

		await setAuditActor(transaction, staffId);
		await transaction.insert(orderShipments).values({ ...shipment, staffId });
		await transaction.insert(orderNotifications).values({
			id: shipment.id,
			orderId: order.id,
			kind: "shipping",
			payload: {
				carrier: shipment.carrier,
				trackingNumber: shipment.trackingNumber,
				trackingUrl: shipment.trackingUrl,
			},
		});
		await transaction
			.insert(shipmentItems)
			.values(lines.map((line) => ({ ...line, shipmentId: shipment.id })));
		const fullyShipped = unshipped.every(
			({ id, remaining }) => remaining === (requested.get(id) ?? 0),
		);
		const status = fullyShipped ? "shipped" : order.status;
		await transaction
			.update(orders)
			.set({
				status,
				trackingNumber: order.trackingNumber || shipment.trackingNumber,
				updatedAt: new Date(Math.max(Date.now(), order.updatedAt.getTime() + 1)),
			})
			.where(eq(orders.id, order.id));
		await transaction.insert(orderEvents).values({
			orderId: order.id,
			staffId,
			previousStatus: order.status,
			status,
			fields: ["Package dispatched"],
		});
	});
