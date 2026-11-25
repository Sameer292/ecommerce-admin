import { and, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/client.server";
import { alphabetical, orderBySort } from "@/db/sort.server";
import { customers } from "@/db/schema/customers";
import { orders } from "@/db/schema/orders";
import { pageOffset, pageSize, searchPattern } from "@/lib/pagination";
import { ActionError } from "@/server/mutation.server";
import type { CustomerSearch, CustomerValues } from "./customer.types";

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

export const listCustomers = async ({ page, q, sort }: CustomerSearch) => {
	const pattern = searchPattern(q);
	const where = q ? or(ilike(customers.name, pattern), ilike(customers.email, pattern)) : undefined;
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
			.limit(pageSize)
			.offset(pageOffset(page)),
		db.$count(customers, where),
	]);
	return { rows, total };
};

export const findCustomer = async (id: string) => {
	const [customer] = await db.select().from(customers).where(eq(customers.id, id));
	return customer;
};

export const saveCustomer = async ({ id, version, ...values }: CustomerValues) => {
	if (!id) return db.insert(customers).values(values);
	const [updated] = await db
		.update(customers)
		.set({ ...values, updatedAt: new Date(), version: sql`${customers.version} + 1` })
		.where(and(eq(customers.id, id), eq(customers.version, version ?? -1)))
		.returning({ id: customers.id });
	if (!updated)
		throw new ActionError("This customer changed or was removed. Refresh before saving.");
};

export const deleteCustomer = (id: string) => db.delete(customers).where(eq(customers.id, id));
