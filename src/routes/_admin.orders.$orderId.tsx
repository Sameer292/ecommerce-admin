import { redirectInvalidPages } from "@/lib/pagination-redirect";
import { listReturnSearchSchema } from "@/lib/list-return";
import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { DetailHeading } from "@/components/admin/detail-heading";
import { can } from "@/features/auth/permissions";
import { FulfillmentForm } from "@/features/orders/order-forms";
import { OrderHistory, OrderLines, PaymentHistory } from "@/features/orders/order-history";
import { OrderStatusBadge } from "@/features/orders/order-labels";
import { OrderNotifications } from "@/features/orders/order-notifications";
import { OrderContact, OrderPayment } from "@/features/orders/order-summary";
import { orderDetailSearchSchema } from "@/features/orders/order-validation";
import { readOrder } from "@/features/orders/orders.functions";
import { OrderPrintActions } from "@/features/orders/order-print-actions";
import { OrderShipments } from "@/features/orders/order-shipments";
import { OrderReturns } from "@/features/orders/order-returns";
import { formatDate } from "@/lib/format";

const OrderItemsTable = () => {
	const { items } = Route.useLoaderData();
	const { store } = Route.useRouteContext();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	return (
		<OrderLines
			{...items}
			currency={store.currency}
			pagination={{
				page: search.page,
				size: search.perPage,
				onPage: (page) => navigate({ search: { ...search, page } }),
				onSize: (perPage) => navigate({ search: { ...search, page: 1, perPage } }),
			}}
			sorting={{
				value: search.sort ?? "id.asc",
				onChange: (sort) =>
					navigate({
						search: { ...search, ...orderDetailSearchSchema.parse({ ...search, page: 1, sort }) },
					}),
			}}
		/>
	);
};

const OrderActivityTable = () => {
	const { activity } = Route.useLoaderData();
	const { store } = Route.useRouteContext();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	return (
		<OrderHistory
			{...activity}
			zone={store.timeZone}
			pagination={{
				page: search.activity,
				size: search.activityPerPage,
				onPage: (activity) => navigate({ search: { ...search, activity } }),
				onSize: (activityPerPage) =>
					navigate({ search: { ...search, activity: 1, activityPerPage } }),
			}}
			sorting={{
				value: search.activitySort ?? "date.desc",
				onChange: (activitySort) =>
					navigate({
						search: {
							...search,
							...orderDetailSearchSchema.parse({ ...search, activity: 1, activitySort }),
						},
					}),
			}}
		/>
	);
};

const OrderPage = () => {
	const { order, payments, shipping, shipmentId, returns, returnId, refundedMinor, notifications } =
		Route.useLoaderData();
	const { store, staff } = Route.useRouteContext();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const editable = can(staff.role, "manageCommerce");
	return (
		<>
			<DetailHeading
				title={`Order #${order.number}`}
				description={`Placed ${formatDate(order.createdAt, store.timeZone)}`}
				back="/orders"
				backLabel="Orders"
			>
				<OrderStatusBadge status={order.status} />
				<OrderPrintActions orderId={order.id} />
			</DetailHeading>
			<div className="grid items-start gap-4 lg:grid-cols-2">
				<FulfillmentForm
					key={order.updatedAt.toISOString()}
					order={order}
					editable={editable}
					dispatched={shipping.shipments.length > 0}
				/>
				<div className="flex min-w-0 flex-col gap-4">
					<OrderContact order={order} />
					<OrderPayment order={order} currency={store.currency} refundedMinor={refundedMinor} />
				</div>
			</div>
			<OrderShipments
				key={shipmentId}
				order={order}
				shipping={shipping}
				shipmentId={shipmentId}
				zone={store.timeZone}
				editable={editable}
			/>
			<OrderItemsTable />
			<OrderReturns
				key={returnId}
				orderId={order.id}
				data={returns}
				returnId={returnId}
				zone={store.timeZone}
				editable={editable}
				dispatched={
					shipping.shipments.length > 0 ||
					order.status === "shipped" ||
					order.status === "delivered"
				}
			/>
			<OrderActivityTable />
			<OrderNotifications notifications={notifications} editable={editable} zone={store.timeZone} />
			<PaymentHistory
				{...payments}
				pagination={{
					page: search.payments,
					size: search.paymentsPerPage,
					onPage: (payments) => navigate({ search: { ...search, payments } }),
					onSize: (paymentsPerPage) =>
						navigate({ search: { ...search, payments: 1, paymentsPerPage } }),
				}}
				currency={store.currency}
				zone={store.timeZone}
			/>
		</>
	);
};

export const Route = createFileRoute("/_admin/orders/$orderId")({
	validateSearch: orderDetailSearchSchema.extend(listReturnSearchSchema.shape),
	search: { middlewares: [stripSearchParams({ page: 1, activity: 1, payments: 1 })] },
	loaderDeps: ({ search }) => orderDetailSearchSchema.parse(search),
	loader: async ({ context: { queryClient }, deps, params, location }) => {
		const data = await queryClient.fetchQuery({
			queryKey: ["order", params.orderId, deps],
			queryFn: ({ signal }) => readOrder({ data: { ...deps, id: params.orderId }, signal }),
		});
		redirectInvalidPages(
			location.pathname,
			{ ...location.search, ...deps },
			data.items.total,
			data.activity.total,
			data.payments.total,
		);
		return data;
	},
	component: OrderPage,
});
