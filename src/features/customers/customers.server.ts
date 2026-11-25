import { and, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import type { output as ZOutput } from "zod";
import { inStaffAudit } from "@/db/audit-actor.server";
import { db } from "@/db/client.server";
import { alphabetical, orderBySort } from "@/db/sort.server";
import { customerIdentities, customers } from "@/db/schema/customers";
import { orders, paymentEvents } from "@/db/schema/orders";
import { openOrder, recentOpenCustomerOrders } from "@/features/orders/orders.server";
import { pageOffset, pageSize, searchPattern } from "@/lib/pagination";
import { ActionError } from "@/server/mutation.server";
import type { CustomerSearch, CustomerValues } from "./customer.types";
import type { mergeCustomerSchema } from "./customer-validation";

const paidOrdersTotal = db
	.select({ customerId: orders.customerId, total: sql`sum(${orders.totalMinor})`.as("total") })
	.from(orders)
	.where(eq(orders.paymentStatus, "paid"))
	.groupBy(orders.customerId)
	.as("paid_orders_total");

const totalPurchasesMinor = sql<number>`coalesce(${paidOrdersTotal.total}, 0)`
	.mapWith(Number)
	.as("total_purchases_minor");

const searchColumns = {
	name: alphabetical(customers.name),
	email: alphabetical(customers.email),
	date: customers.createdAt,
	purchases: totalPurchasesMinor,
};

export const listCustomers = async ({ page, q, sort, perPage }: CustomerSearch) => {
	const pattern = searchPattern(q);
	const digits = /^[+0-9().\s-]+$/.test(q) ? q.replace(/[^0-9]/g, "") : "";
	const normalizedPhone = sql`regexp_replace(${customers.phone}, '[^0-9]', '', 'g')`;
	const matching = q
		? or(
				ilike(customers.name, pattern),
				ilike(customers.email, pattern),
				digits ? ilike(normalizedPhone, searchPattern(digits)) : undefined,
			)
		: undefined;
	const where = and(isNull(customers.mergedInto), isNull(customers.anonymizedAt), matching);
	const [rows, total] = await Promise.all([
		db
			.select({
				id: customers.id,
				name: customers.name,
				email: customers.email,
				phone: customers.phone,
				totalPurchasesMinor,
				createdAt: customers.createdAt,
			})
			.from(customers)
			.leftJoin(paidOrdersTotal, eq(paidOrdersTotal.customerId, customers.id))
			.where(where)
			.orderBy(...orderBySort(searchColumns, sort ?? "name.asc", customers.id))
			.limit(perPage ?? pageSize)
			.offset(pageOffset(page, perPage)),
		db.$count(customers, where),
	]);
	return { rows, total };
};

export const findCustomer = async (id: string) => {
	const [customer] = await db.select().from(customers).where(eq(customers.id, id));
	return customer;
};

export const customerOrderSummary = async (id: string) => {
	const [[counts], [payments], outstanding] = await Promise.all([
		db
			.select({
				count: sql`count(*)`.mapWith(Number),
				openCount: sql`count(*) filter (where ${openOrder})`.mapWith(Number),
				first: sql`min(${orders.createdAt})`.mapWith((value) => new Date(value)),
				last: sql`max(${orders.createdAt})`.mapWith((value) => new Date(value)),
			})
			.from(orders)
			.where(eq(orders.customerId, id)),
		db
			.select({
				paid: sql`coalesce(sum(${paymentEvents.amountMinor}) filter (where ${paymentEvents.status} = 'paid'), 0)`.mapWith(
					Number,
				),
				refunded:
					sql`coalesce(sum(${paymentEvents.amountMinor}) filter (where ${paymentEvents.status} = 'refunded'), 0)`.mapWith(
						Number,
					),
				paidOrders: sql`count(*) filter (where ${paymentEvents.status} = 'paid')`.mapWith(Number),
			})
			.from(orders)
			.innerJoin(paymentEvents, eq(paymentEvents.orderId, orders.id))
			.where(eq(orders.customerId, id)),
		recentOpenCustomerOrders(id),
	]);
	return {
		...counts,
		spend: payments.paid - payments.refunded,
		average: payments.paidOrders ? Math.round(payments.paid / payments.paidOrders) : null,
		outstanding,
	};
};

export const saveCustomer = async ({ id, version, ...values }: CustomerValues) => {
	if (!id) return db.insert(customers).values(values);
	const [updated] = await db
		.update(customers)
		.set({ ...values, updatedAt: new Date(), version: sql`${customers.version} + 1` })
		.where(
			and(
				eq(customers.id, id),
				eq(customers.version, version ?? -1),
				isNull(customers.mergedInto),
				isNull(customers.anonymizedAt),
			),
		)
		.returning({ id: customers.id });
	if (!updated)
		throw new ActionError("This customer changed or was removed. Refresh before saving.");
};

export const deleteCustomer = (id: string) =>
	db
		.delete(customers)
		.where(and(eq(customers.id, id), isNull(customers.mergedInto), isNull(customers.anonymizedAt)));

export const mergeDuplicateCustomer = (
	{ id, version, targetEmail, reason }: ZOutput<typeof mergeCustomerSchema>,
	staffId: string,
) =>
	inStaffAudit(staffId, async (transaction) => {
		const [match] = await transaction
			.select({ id: customers.id })
			.from(customers)
			.where(eq(customers.email, targetEmail));
		if (!match || match.id === id)
			throw new ActionError("Enter the email of a different customer to keep.", "targetEmail");
		const locked = await transaction
			.select()
			.from(customers)
			.where(inArray(customers.id, [id, match.id]))
			.orderBy(customers.id)
			.for("update");
		const source = locked.find((entry) => entry.id === id);
		const target = locked.find((entry) => entry.id === match.id);
		if (!target || target.mergedInto || target.anonymizedAt || target.email !== targetEmail)
			throw new ActionError(
				"The customer to keep changed. Enter their current email.",
				"targetEmail",
			);
		if (!source || source.mergedInto || source.anonymizedAt || source.version !== version)
			throw new ActionError("This customer changed. Refresh before merging.");
		await transaction
			.update(orders)
			.set({ customerId: target.id })
			.where(eq(orders.customerId, id));
		await transaction
			.update(customerIdentities)
			.set({ customerId: target.id })
			.where(eq(customerIdentities.customerId, id));
		await transaction
			.update(customers)
			.set({ mergedInto: target.id })
			.where(eq(customers.mergedInto, id));
		await transaction
			.update(customers)
			.set({
				mergedInto: target.id,
				mergedAt: sql`now()`,
				mergedBy: staffId,
				mergeReason: reason,
				version: sql`${customers.version} + 1`,
				updatedAt: sql`now()`,
			})
			.where(eq(customers.id, id));
	});
