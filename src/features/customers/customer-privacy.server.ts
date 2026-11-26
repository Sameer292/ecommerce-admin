import { and, eq, inArray, notInArray, or, sql } from "drizzle-orm";
import type { output as ZOutput } from "zod";
import { inStaffAudit } from "@/db/audit-actor.server";
import { db } from "@/db/client.server";
import { customerIdentities, customers } from "@/db/schema/customers";
import {
	orderEvents,
	orderNotifications,
	orderReturns,
	orderShipments,
	orders,
	paymentEvents,
} from "@/db/schema/orders";
import { ActionError } from "@/server/mutation.server";
import type { anonymizeCustomerSchema } from "./customer-validation";

const aliases = (id: string) => or(eq(customers.id, id), eq(customers.mergedInto, id));

export const exportCustomerData = (id: string) =>
	db.transaction(
		async (transaction) => {
			const profiles = await transaction
				.select({
					id: customers.id,
					name: customers.name,
					email: customers.email,
					phone: customers.phone,
					notes: customers.notes,
					createdAt: customers.createdAt,
					mergedInto: customers.mergedInto,
					anonymizedAt: customers.anonymizedAt,
				})
				.from(customers)
				.where(aliases(id));
			const profile = profiles.find((row) => row.id === id);
			if (!profile || profile.mergedInto || profile.anonymizedAt) return null;
			const orderIds = transaction
				.select({ id: orders.id })
				.from(orders)
				.where(eq(orders.customerId, id));
			const [history, identities, shipments, returns, payments] = await Promise.all([
				transaction
					.select({
						number: orders.number,
						id: orders.id,
						createdAt: orders.createdAt,
						status: orders.status,
						paymentStatus: orders.paymentStatus,
						totalMinor: orders.totalMinor,
						buyerName: orders.buyerName,
						buyerEmail: orders.buyerEmail,
						buyerPhone: orders.buyerPhone,
						shippingName: orders.shippingName,
						shippingAddress: orders.shippingAddress,
						notes: orders.notes,
					})
					.from(orders)
					.where(eq(orders.customerId, id))
					.orderBy(orders.createdAt, orders.id),
				transaction
					.select({ externalId: customerIdentities.externalId })
					.from(customerIdentities)
					.where(eq(customerIdentities.customerId, id)),
				transaction
					.select({
						orderId: orderShipments.orderId,
						carrier: orderShipments.carrier,
						trackingNumber: orderShipments.trackingNumber,
						trackingUrl: orderShipments.trackingUrl,
						dispatchedAt: orderShipments.dispatchedAt,
					})
					.from(orderShipments)
					.where(inArray(orderShipments.orderId, orderIds)),
				transaction
					.select({
						orderId: orderReturns.orderId,
						status: orderReturns.status,
						quantity: orderReturns.quantity,
						reason: orderReturns.reason,
					})
					.from(orderReturns)
					.where(inArray(orderReturns.orderId, orderIds)),
				transaction
					.select({
						orderId: paymentEvents.orderId,
						status: paymentEvents.status,
						amountMinor: paymentEvents.amountMinor,
						occurredAt: paymentEvents.occurredAt,
					})
					.from(paymentEvents)
					.where(inArray(paymentEvents.orderId, orderIds)),
			]);
			return { profiles, identities, orders: history, shipments, returns, payments };
		},
		{ isolationLevel: "repeatable read", accessMode: "read only" },
	);

const queuedStatuses = ["pending", "sending", "failed"] as const;

export const anonymizeCustomerData = (
	{ id, version }: ZOutput<typeof anonymizeCustomerSchema>,
	staffId: string,
) =>
	inStaffAudit(staffId, async (transaction) => {
		const [customer] = await transaction
			.select()
			.from(customers)
			.where(eq(customers.id, id))
			.for("update");
		if (!customer || customer.mergedInto || customer.anonymizedAt || customer.version !== version)
			throw new ActionError("This profile changed. Refresh before anonymizing.");
		const orderHistory = await transaction
			.select({ id: orders.id, status: orders.status })
			.from(orders)
			.where(eq(orders.customerId, id))
			.orderBy(orders.id)
			.for("update");
		if (orderHistory.some(({ status }) => status !== "delivered" && status !== "cancelled"))
			throw new ActionError("Complete or cancel open orders before anonymizing this customer.");
		const orderIds = transaction
			.select({ id: orders.id })
			.from(orders)
			.where(eq(orders.customerId, id));
		const [activeReturn] = await transaction
			.select({ id: orderReturns.id })
			.from(orderReturns)
			.where(
				and(
					inArray(orderReturns.orderId, orderIds),
					notInArray(orderReturns.status, ["refunded", "rejected"]),
				),
			)
			.limit(1);
		if (activeReturn)
			throw new ActionError("Resolve open returns before anonymizing this customer.");
		const queued = inArray(orderNotifications.status, queuedStatuses);
		const locked = await transaction
			.select({
				active: sql<boolean>`${orderNotifications.status} = 'sending' AND ${orderNotifications.leaseUntil} > now()`,
			})
			.from(orderNotifications)
			.where(and(inArray(orderNotifications.orderId, orderIds), queued))
			.for("update");
		if (locked.some(({ active }) => active))
			throw new ActionError("A customer notification is being sent. Try again after it completes.");

		await transaction
			.update(orderNotifications)
			.set({ status: "suppressed", claimId: null, leaseUntil: null, updatedAt: sql`now()` })
			.where(and(inArray(orderNotifications.orderId, orderIds), queued));
		await transaction
			.update(orderNotifications)
			.set({ payload: sql`${orderNotifications.payload} - ARRAY['trackingNumber','trackingUrl']` })
			.where(inArray(orderNotifications.orderId, orderIds));
		await transaction
			.update(orderShipments)
			.set({ trackingNumber: "", trackingUrl: "" })
			.where(inArray(orderShipments.orderId, orderIds));
		await transaction
			.update(orderEvents)
			.set({ reason: "" })
			.where(inArray(orderEvents.orderId, orderIds));
		await transaction
			.update(orderReturns)
			.set({ reason: "Removed during anonymization" })
			.where(inArray(orderReturns.orderId, orderIds));
		await transaction
			.update(orders)
			.set({
				buyerName: "",
				buyerEmail: "",
				buyerPhone: "",
				shippingName: "",
				shippingAddress: "",
				trackingNumber: "",
				notes: "",
				updatedAt: sql`greatest(now(), ${orders.updatedAt} + interval '1 millisecond')`,
			})
			.where(eq(orders.customerId, id));
		await transaction.delete(customerIdentities).where(eq(customerIdentities.customerId, id));
		await transaction
			.update(customers)
			.set({
				name: "Anonymized customer",
				email: sql`gen_random_uuid()::text || '@customer-redacted.invalid'`,
				phone: "",
				notes: "",
				mergeReason: null,
				anonymizedAt: sql`now()`,
				anonymizedBy: staffId,
				updatedAt: sql`now()`,
				version: sql`${customers.version} + 1`,
			})
			.where(aliases(id));
	});
