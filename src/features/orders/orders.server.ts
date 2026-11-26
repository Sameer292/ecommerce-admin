import {
	and,
	desc,
	eq,
	exists,
	gte,
	ilike,
	inArray,
	lt,
	lte,
	ne,
	notExists,
	or,
	sql,
	type SQL,
} from "drizzle-orm";
import { union } from "drizzle-orm/pg-core";
import { db } from "@/db/client.server";
import { alphabetical, orderBySort } from "@/db/sort.server";
import { customers } from "@/db/schema/customers";
import { orderReturns, orders, orderShipments } from "@/db/schema/orders";
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

const awaitingDispatch = inArray(orders.status, ["pending", "processing"]);
export const openOrder = inArray(orders.status, ["pending", "processing", "shipped"]);
export const recentOpenCustomerOrders = (customerId: string) =>
	orderRows(and(eq(orders.customerId, customerId), openOrder))
		.orderBy(desc(orders.createdAt), desc(orders.id))
		.limit(5);
const orderPackages = db.select({ id: orderShipments.id }).from(orderShipments);
const missingTracking = or(
	and(
		inArray(orders.status, ["shipped", "delivered"]),
		eq(orders.trackingNumber, ""),
		notExists(orderPackages.where(eq(orderShipments.orderId, orders.id))),
	),
	exists(
		db
			.select({ id: orderShipments.id })
			.from(orderShipments)
			.where(
				and(
					eq(orderShipments.orderId, orders.id),
					eq(orderShipments.trackingNumber, ""),
					eq(orderShipments.trackingUrl, ""),
				),
			),
	),
);
const shippingFilters = {
	awaiting_dispatch: awaitingDispatch,
	in_transit: eq(orders.status, "shipped"),
	delivered: eq(orders.status, "delivered"),
	missing_tracking: missingTracking,
};
const viewFilters = {
	paid_to_fulfill: and(eq(orders.paymentStatus, "paid"), awaitingDispatch),
	to_fulfill: and(
		awaitingDispatch,
		ne(orders.paymentStatus, "refunded"),
		or(eq(orders.paymentStatus, "paid"), eq(orders.cashOnDelivery, true)),
	),
	open_returns: exists(
		db
			.select({ id: orderReturns.id })
			.from(orderReturns)
			.where(
				and(
					eq(orderReturns.orderId, orders.id),
					inArray(orderReturns.status, ["requested", "approved", "received"]),
				),
			),
	),
	overdue_unpaid: and(
		eq(orders.paymentStatus, "pending"),
		eq(orders.cashOnDelivery, false),
		awaitingDispatch,
		lt(orders.createdAt, sql`now() - interval '48 hours'`),
	),
};

export const orderWorkCounts = async () => {
	const [fulfillment, overdue, tracking, returns] = await Promise.all([
		db.$count(orders, viewFilters.to_fulfill),
		db.$count(orders, viewFilters.overdue_unpaid),
		db.$count(orders, shippingFilters.missing_tracking),
		db.$count(orders, viewFilters.open_returns),
	]);
	return { fulfillment, overdue, tracking, returns };
};

const orderFilter = (search: OrderSearch, customerId: string | undefined, timeZone: string) => {
	const {
		q,
		status,
		payment,
		shipping,
		view,
		placedFrom,
		placedThrough,
		minTotalMinor,
		maxTotalMinor,
	} = search;
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
		payment ? eq(orders.paymentStatus, payment) : undefined,
		shipping ? shippingFilters[shipping] : undefined,
		view ? viewFilters[view] : undefined,
		placedFrom
			? gte(orders.createdAt, sql`(${placedFrom}::date::timestamp AT TIME ZONE ${timeZone})`)
			: undefined,
		placedThrough
			? lt(
					orders.createdAt,
					sql`((${placedThrough}::date + 1)::timestamp AT TIME ZONE ${timeZone})`,
				)
			: undefined,
		minTotalMinor === undefined ? undefined : gte(orders.totalMinor, minTotalMinor),
		maxTotalMinor === undefined ? undefined : lte(orders.totalMinor, maxTotalMinor),
		customerId ? eq(orders.customerId, customerId) : undefined,
	);
};

export const listOrders = async (search: OrderSearch, customerId?: string, timeZone = "UTC") => {
	const where = orderFilter(search, customerId, timeZone);
	const [rows, total] = await Promise.all([
		orderRows(where)
			.orderBy(...orderBySort(orderSortColumns, search.sort ?? "date.desc", orders.id))
			.limit(search.perPage ?? pageSize)
			.offset(pageOffset(search.page, search.perPage)),
		db.$count(orders, where),
	]);
	return { rows, total };
};
