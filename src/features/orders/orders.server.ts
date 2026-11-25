import { and, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { union } from "drizzle-orm/pg-core";
import { db } from "@/db/client.server";
import { alphabetical, orderBySort } from "@/db/sort.server";
import { customers } from "@/db/schema/customers";
import { orders } from "@/db/schema/orders";
import { pageOffset, pageSize, searchPattern } from "@/lib/pagination";
import type { OrderSearch } from "./order.types";

const orderSortColumns = {
	number: alphabetical(orders.number),
	customer: alphabetical(customers.name),
	date: orders.createdAt,
	total: orders.totalMinor,
};

const orderColumns = {
	id: orders.id,
	number: orders.number,
	status: orders.status,
	paymentStatus: orders.paymentStatus,
	totalMinor: orders.totalMinor,
	createdAt: orders.createdAt,
	customerName: customers.name,
};

const orderRows = (where?: SQL) =>
	db
		.select(orderColumns)
		.from(orders)
		.innerJoin(customers, eq(orders.customerId, customers.id))
		.where(where);

export const recentOrders = () =>
	orderRows().orderBy(desc(orders.createdAt), desc(orders.id)).limit(5);

const orderFilter = ({ q, status }: OrderSearch, customerId?: string) => {
	const pattern = searchPattern(q);
	return and(
		q
			? inArray(
					orders.id,
					union(
						db.select({ id: orders.id }).from(orders).where(ilike(orders.number, pattern)),
						db
							.select({ id: orders.id })
							.from(customers)
							.innerJoin(orders, eq(orders.customerId, customers.id))
							.where(or(ilike(customers.name, pattern), ilike(customers.email, pattern))),
					),
				)
			: undefined,
		status ? eq(orders.status, status) : undefined,
		customerId ? eq(orders.customerId, customerId) : undefined,
	);
};

export const listOrders = async (search: OrderSearch, customerId?: string) => {
	const where = orderFilter(search, customerId);
	const [rows, total] = await Promise.all([
		orderRows(where)
			.orderBy(...orderBySort(orderSortColumns, search.sort ?? "date.desc", orders.id))
			.limit(search.perPage ?? pageSize)
			.offset(pageOffset(search.page, search.perPage)),
		db.$count(orders, where),
	]);
	return { rows, total };
};
