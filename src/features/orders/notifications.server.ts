import { and, asc, desc, eq, gt, lte, or, sql } from "drizzle-orm";
import { db } from "@/db/client.server";
import { orderNotifications, orders } from "@/db/schema/orders";
import { ActionError } from "@/server/mutation.server";

export const claimNotification = () =>
	db.transaction(async (transaction) => {
		const [job] = await transaction
			.select({
				id: orderNotifications.id,
				kind: orderNotifications.kind,
				payload: orderNotifications.payload,
				orderId: orderNotifications.orderId,
			})
			.from(orderNotifications)
			.where(
				or(
					eq(orderNotifications.status, "pending"),
					and(
						eq(orderNotifications.status, "sending"),
						lte(orderNotifications.leaseUntil, sql`now()`),
					),
				),
			)
			.orderBy(asc(orderNotifications.createdAt), asc(orderNotifications.id))
			.limit(1)
			.for("update", { skipLocked: true });
		if (!job) return null;
		const claimId = crypto.randomUUID();
		const [claim] = await transaction
			.update(orderNotifications)
			.set({
				claimId,
				status: "sending",
				attempts: sql`${orderNotifications.attempts} + 1`,
				leaseUntil: sql`now() + interval '5 minutes'`,
				updatedAt: sql`now()`,
			})
			.where(eq(orderNotifications.id, job.id))
			.returning({ leaseUntil: orderNotifications.leaseUntil });
		const { orderId, ...notification } = job;
		const [order] = await transaction
			.select({ number: orders.number })
			.from(orders)
			.where(eq(orders.id, orderId));
		return { ...notification, number: order.number, claimId, leaseUntil: claim.leaseUntil };
	});

export const acknowledgeNotification = async (
	id: string,
	claimId: string,
	status: "sent" | "failed",
) => {
	const [job] = await db
		.update(orderNotifications)
		.set({ status, leaseUntil: null, updatedAt: sql`now()` })
		.where(
			and(
				eq(orderNotifications.id, id),
				eq(orderNotifications.claimId, claimId),
				eq(orderNotifications.status, "sending"),
				gt(orderNotifications.leaseUntil, sql`now()`),
			),
		)
		.returning({ id: orderNotifications.id });
	if (job) return true;
	return Boolean(
		await db.$count(
			orderNotifications,
			and(
				eq(orderNotifications.id, id),
				eq(orderNotifications.claimId, claimId),
				eq(orderNotifications.status, status),
			),
		),
	);
};

export const retryOrderNotification = async (id: string) => {
	const [job] = await db
		.update(orderNotifications)
		.set({ status: "pending", claimId: null, updatedAt: sql`now()` })
		.where(and(eq(orderNotifications.id, id), eq(orderNotifications.status, "failed")))
		.returning({ id: orderNotifications.id });
	if (!job) throw new ActionError("Only failed notifications can be queued again.");
};

export const listOrderNotifications = (orderId: string) =>
	db
		.select({
			id: orderNotifications.id,
			kind: orderNotifications.kind,
			status: orderNotifications.status,
			attempts: orderNotifications.attempts,
			updatedAt: orderNotifications.updatedAt,
		})
		.from(orderNotifications)
		.where(eq(orderNotifications.orderId, orderId))
		.orderBy(desc(orderNotifications.createdAt), desc(orderNotifications.id));
