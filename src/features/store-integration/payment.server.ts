import { eq } from "drizzle-orm";
import { db } from "@/db/client.server";
import { orders } from "@/db/schema/orders";
import { IntegrationError } from "./integration-request.server";
import type { PaymentUpdate } from "./integration.types";

export const updatePayment = (input: PaymentUpdate) =>
	db.transaction(async (transaction) => {
		const [order] = await transaction
			.select()
			.from(orders)
			.where(eq(orders.number, input.number))
			.for("update");
		if (!order) throw new IntegrationError(404, "Order not found.");
		if (order.paymentStatus === input.status) return { id: order.id };
		const paid = input.status === "paid";
		if ((paid && order.paymentStatus !== "pending") || (!paid && order.paymentStatus !== "paid")) {
			throw new IntegrationError(409, "Invalid payment status transition.");
		}
		if (paid && input.paidAt < order.createdAt)
			throw new IntegrationError(400, "Payment cannot predate the order.");
		const updatedAt = new Date(Math.max(Date.now(), order.updatedAt.getTime() + 1));
		await transaction
			.update(orders)
			.set({
				paymentStatus: input.status,
				paidAt: paid ? input.paidAt : order.paidAt,
				updatedAt,
			})
			.where(eq(orders.id, order.id));
		return { id: order.id };
	});
