import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client.server";
import { orderReturns, orders, paymentEvents } from "@/db/schema/orders";
import { IntegrationError } from "./integration-request.server";
import type { PaymentUpdate, Transaction } from "./integration.types";

type PaymentEvent = typeof paymentEvents.$inferSelect;

const verifyRetry = (previous: PaymentEvent, input: PaymentUpdate, occurredAt?: Date) => {
	if (occurredAt && previous.occurredAt?.getTime() !== occurredAt.getTime()) {
		throw new IntegrationError(409, "Payment timestamp does not match the recorded payment.");
	}
	if (
		(input.amountMinor !== undefined && input.amountMinor !== previous.amountMinor) ||
		(input.externalId !== undefined && input.externalId !== previous.externalId) ||
		(input.source !== undefined && input.source !== previous.source) ||
		(input.method !== undefined && input.method !== previous.method) ||
		(input.status === "refunded" &&
			input.returnId !== undefined &&
			input.returnId !== previous.returnId)
	) {
		throw new IntegrationError(409, "Payment details do not match the recorded event.");
	}
};

export const refundedAmount = async (orderId: string, reader: typeof db | Transaction = db) => {
	const [row] = await reader
		.select({
			amount: sql<number>`coalesce(sum(${paymentEvents.amountMinor}), 0)`.mapWith(Number),
		})
		.from(paymentEvents)
		.where(and(eq(paymentEvents.orderId, orderId), eq(paymentEvents.status, "refunded")));
	return row.amount;
};

const checkRefund = async (
	transaction: Transaction,
	order: typeof orders.$inferSelect,
	input: Extract<PaymentUpdate, { status: "refunded" }>,
) => {
	const remaining = order.totalMinor - (await refundedAmount(order.id, transaction));
	const amount = input.amountMinor ?? remaining;
	if (amount > remaining || (amount === 0 && remaining > 0)) {
		throw new IntegrationError(400, "Refund amount must be within the remaining paid balance.");
	}
	if (amount < remaining && !input.externalId)
		throw new IntegrationError(400, "Send an external ID for a partial refund.");
	if (input.returnId) {
		if (!input.externalId || input.amountMinor === undefined) {
			throw new IntegrationError(400, "Send an external ID and an amount for a return refund.");
		}
		const [record] = await transaction
			.select({ status: orderReturns.status })
			.from(orderReturns)
			.where(and(eq(orderReturns.id, input.returnId), eq(orderReturns.orderId, order.id)));
		if (record?.status !== "received")
			throw new IntegrationError(409, "Receive the return before recording its refund.");
	}
	return { amount, fulfilled: amount === remaining };
};

export const updatePayment = (input: PaymentUpdate) =>
	db.transaction(async (transaction) => {
		const [order] = await transaction
			.select()
			.from(orders)
			.where(eq(orders.number, input.number))
			.for("update");
		if (!order) throw new IntegrationError(404, "Order not found.");
		const paid = input.status === "paid";
		const occurredAt = paid
			? input.paidAt
			: input.status === "failed"
				? input.failedAt
				: input.refundedAt;
		const source = input.source ?? "storefront";
		if (input.externalId && input.status !== "paid") {
			const [previous] = await transaction
				.select()
				.from(paymentEvents)
				.where(
					and(
						eq(paymentEvents.source, source),
						eq(paymentEvents.status, input.status),
						eq(paymentEvents.externalId, input.externalId),
					),
				);
			if (previous) {
				if (previous.orderId !== order.id)
					throw new IntegrationError(409, "This payment event is already recorded.");
				verifyRetry(previous, input, occurredAt);
				return { id: order.id, paymentStatus: order.paymentStatus };
			}
		}
		if (order.paymentStatus === input.status) {
			const [previous] = await transaction
				.select()
				.from(paymentEvents)
				.where(and(eq(paymentEvents.orderId, order.id), eq(paymentEvents.status, input.status)))
				.orderBy(desc(paymentEvents.recordedAt), desc(paymentEvents.id))
				.limit(1);
			if (!previous) throw new IntegrationError(409, "The recorded payment is unavailable.");
			verifyRetry(previous, input, occurredAt);
			return { id: order.id, paymentStatus: order.paymentStatus };
		}

		if (
			input.status !== "failed" &&
			(paid ? order.paymentStatus !== "pending" : order.paymentStatus !== "paid")
		) {
			throw new IntegrationError(409, "Invalid payment status transition.");
		}
		const eventDate = occurredAt ?? new Date();
		const earliest = input.status === "refunded" ? order.paidAt : order.createdAt;
		if (earliest && eventDate < earliest) {
			throw new IntegrationError(
				400,
				input.status === "refunded"
					? "Refund cannot predate the payment."
					: "Payment cannot predate the order.",
			);
		}

		if (paid && input.amountMinor !== undefined && input.amountMinor !== order.totalMinor) {
			throw new IntegrationError(400, "Payment amount must match the order total.");
		}
		const refund =
			input.status === "refunded" ? await checkRefund(transaction, order, input) : undefined;
		const returnId = input.status === "refunded" ? input.returnId : undefined;
		const [event] = await transaction
			.insert(paymentEvents)
			.values({
				orderId: order.id,
				status: input.status,
				amountMinor: refund?.amount ?? input.amountMinor ?? order.totalMinor,
				occurredAt: eventDate,
				source,
				externalId: input.externalId,
				method: input.method,
				returnId,
			})
			.onConflictDoNothing()
			.returning({ id: paymentEvents.id });
		if (!event) throw new IntegrationError(409, "This payment event is already recorded.");
		if (returnId) {
			await transaction
				.update(orderReturns)
				.set({ status: "refunded", updatedAt: new Date(), updatedBy: null })
				.where(eq(orderReturns.id, returnId));
		}
		const paymentStatus =
			input.status === "failed"
				? order.paymentStatus
				: refund && !refund.fulfilled
					? "paid"
					: input.status;
		if (input.status !== "failed") {
			await transaction
				.update(orders)
				.set({
					paymentStatus,
					paidAt: paid ? input.paidAt : order.paidAt,
					updatedAt: new Date(Math.max(Date.now(), order.updatedAt.getTime() + 1)),
				})
				.where(eq(orders.id, order.id));
		}
		return { id: order.id, paymentStatus };
	});
