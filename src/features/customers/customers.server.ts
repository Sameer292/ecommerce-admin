import { asc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db/client.server";
import { customers } from "@/db/schema/customers";
import { pageOffset, pageSize, searchPattern } from "@/lib/pagination";
import { ActionError } from "@/server/mutation.server";
import type { CustomerSearch, CustomerValues } from "./customer.types";

export const listCustomers = async ({ page, q }: CustomerSearch) => {
	const pattern = searchPattern(q);
	const where = q ? or(ilike(customers.name, pattern), ilike(customers.email, pattern)) : undefined;
	const [rows, total] = await Promise.all([
		db
			.select({
				id: customers.id,
				name: customers.name,
				email: customers.email,
				phone: customers.phone,
				createdAt: customers.createdAt,
			})
			.from(customers)
			.where(where)
			.orderBy(asc(customers.name), asc(customers.id))
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
