import { and, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/client.server";
import { alphabetical, orderBySort } from "@/db/sort.server";
import { customers } from "@/db/schema/customers";
import { orders } from "@/db/schema/orders";
import { pageOffset, pageSize, searchPattern } from "@/lib/pagination";
import { ActionError } from "@/server/mutation.server";
import type { CustomerSearch, CustomerValues } from "./customer.types";

const paidOrdersTotal = db
	.select({ total: sql`coalesce(sum(${orders.totalMinor}), 0)` })
	.from(orders)
	.where(and(eq(orders.customerId, customers.id), eq(orders.paymentStatus, "paid")));

const totalPurchasesMinor = sql<number>`(${paidOrdersTotal})`
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

export const saveCustomer = async ({ id, ...values }: CustomerValues) => {
	if (!id) return db.insert(customers).values(values);
	const [updated] = await db
		.update(customers)
		.set({ ...values, updatedAt: new Date() })
		.where(eq(customers.id, id))
		.returning({ id: customers.id });
	if (!updated) throw new ActionError("This customer no longer exists.");
};

export const deleteCustomer = (id: string) => db.delete(customers).where(eq(customers.id, id));
