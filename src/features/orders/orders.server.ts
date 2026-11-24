import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
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
			? or(
					ilike(orders.number, pattern),
					ilike(customers.name, pattern),
					ilike(customers.email, pattern),
				)
			: undefined,
		status ? eq(orders.status, status) : undefined,
		customerId ? eq(orders.customerId, customerId) : undefined,
	);
};

export const listOrders = async (search: OrderSearch, customerId?: string) => {
	const where = orderFilter(search, customerId);
	// The count uses the same customer join when matching names or email addresses.
	const totalsQuery = db
		.select({ total: count() })
		.from(orders)
		.innerJoin(customers, eq(orders.customerId, customers.id))
		.where(where);
	const [rows, totals] = await Promise.all([
		orderRows(where)
			.orderBy(...orderBySort(orderSortColumns, search.sort ?? "date.desc", orders.id))
			.limit(pageSize)
			.offset(pageOffset(search.page)),
		totalsQuery,
	]);
	return { rows, total: totals[0]?.total ?? 0 };
};
