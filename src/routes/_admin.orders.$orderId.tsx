import { redirectInvalidPages } from "@/lib/pagination-redirect";
import { listReturnSearchSchema } from "@/lib/list-return";
import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { DetailHeading } from "@/components/admin/detail-heading";
import { can } from "@/features/auth/permissions";
import { FulfillmentForm } from "@/features/orders/order-forms";
import { OrderHistory, OrderLines, PaymentHistory } from "@/features/orders/order-history";
import { OrderStatusBadge } from "@/features/orders/order-labels";
import { OrderContact, OrderPayment } from "@/features/orders/order-summary";
import { orderDetailSearchSchema } from "@/features/orders/order-validation";
import { readOrder } from "@/features/orders/orders.functions";
import { OrderShipments } from "@/features/orders/order-shipments";
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
			page={search.page}
			onPage={(page) => navigate({ search: { ...search, page } })}
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
			page={search.activity}
			onPage={(activity) => navigate({ search: { ...search, activity } })}
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
	const { order, payments, shipping, shipmentId } = Route.useLoaderData();
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
					<OrderPayment order={order} currency={store.currency} />
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
			<OrderActivityTable />
			<PaymentHistory
				{...payments}
				page={search.payments}
				onPage={(payments) => navigate({ search: { ...search, payments } })}
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
