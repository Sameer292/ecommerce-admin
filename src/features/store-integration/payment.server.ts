import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client.server";
import { orders, paymentEvents } from "@/db/schema/orders";
import { IntegrationError } from "./integration-request.server";
import type { PaymentUpdate, Transaction } from "./integration.types";

type PaymentEvent = typeof paymentEvents.$inferSelect;
type NewPaymentEvent = typeof paymentEvents.$inferInsert;

const verifyRetry = (previous: PaymentEvent, input: PaymentUpdate, occurredAt?: Date) => {
	if (occurredAt && previous.occurredAt?.getTime() !== occurredAt.getTime()) {
		throw new IntegrationError(409, "Payment timestamp does not match the recorded payment.");
	}
	if (
		(input.amountMinor !== undefined && input.amountMinor !== previous.amountMinor) ||
		(input.externalId !== undefined && input.externalId !== previous.externalId) ||
		(input.source !== undefined && input.source !== previous.source) ||
		(input.method !== undefined && input.method !== previous.method)
	) {
		throw new IntegrationError(409, "Payment details do not match the recorded event.");
	}
};

const savePaymentEvent = async (
	transaction: Transaction,
	event: NewPaymentEvent,
	input: PaymentUpdate,
) => {
	const [inserted] = await transaction
		.insert(paymentEvents)
		.values(event)
		.onConflictDoNothing()
		.returning({ id: paymentEvents.id });
	if (inserted) return;
	const [previous] = event.externalId
		? await transaction
				.select()
				.from(paymentEvents)
				.where(
					and(
						eq(paymentEvents.externalId, event.externalId),
						eq(paymentEvents.source, event.source),
						eq(paymentEvents.status, event.status),
					),
				)
		: [];
	if (!previous || previous.orderId !== event.orderId) {
		throw new IntegrationError(409, "This payment event is already recorded.");
	}
	verifyRetry(previous, input, event.occurredAt ?? undefined);
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
		if (order.paymentStatus === input.status) {
			const [previous] = await transaction
				.select()
				.from(paymentEvents)
				.where(and(eq(paymentEvents.orderId, order.id), eq(paymentEvents.status, input.status)))
				.orderBy(desc(paymentEvents.recordedAt), desc(paymentEvents.id))
				.limit(1);
			if (!previous) throw new IntegrationError(409, "The recorded payment is unavailable.");
			verifyRetry(previous, input, occurredAt);
			return { id: order.id };
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
		const amountMinor = input.amountMinor ?? order.totalMinor;
		if (input.status !== "failed" && amountMinor !== order.totalMinor) {
			throw new IntegrationError(400, "Payment amount must match the order total.");
		}

		await savePaymentEvent(
			transaction,
			{
				orderId: order.id,
				status: input.status,
				amountMinor,
				occurredAt: eventDate,
				source: input.source ?? "storefront",
				externalId: input.externalId,
				method: input.method,
			},
			input,
		);
		if (input.status !== "failed") {
			await transaction
				.update(orders)
				.set({
					paymentStatus: input.status,
					paidAt: paid ? input.paidAt : order.paidAt,
					updatedAt: new Date(Math.max(Date.now(), order.updatedAt.getTime() + 1)),
				})
				.where(eq(orders.id, order.id));
		}
		return { id: order.id };
	});
