import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { DetailHeading } from "@/components/admin/detail-heading";
import { can } from "@/features/auth/permissions";
import { FulfillmentForm } from "@/features/orders/order-forms";
import { OrderHistory, OrderLines } from "@/features/orders/order-history";
import { OrderStatusBadge } from "@/features/orders/order-labels";
import { OrderContact, OrderPayment } from "@/features/orders/order-summary";
import { orderDetailSearchSchema } from "@/features/orders/order-validation";
import { readOrder } from "@/features/orders/orders.functions";
import { formatDate } from "@/lib/format";

const OrderTables = () => {
	const { items, activity: events } = Route.useLoaderData();
	const { store } = Route.useRouteContext();
	const { page, activity } = Route.useSearch();
	const navigate = Route.useNavigate();
	return (
		<>
			<OrderLines
				{...items}
				currency={store.currency}
				page={page}
				onPage={(next) => navigate({ search: { page: next, activity } })}
			/>
			<OrderHistory
				{...events}
				zone={store.timeZone}
				page={activity}
				onPage={(next) => navigate({ search: { page, activity: next } })}
			/>
		</>
	);
};

const OrderPage = () => {
	const { order, customer } = Route.useLoaderData();
	const { store, staff } = Route.useRouteContext();
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
					editable={can(staff.role, "manageCommerce")}
				/>
				<div className="flex min-w-0 flex-col gap-4">
					<OrderContact order={order} customer={customer} />
					<OrderPayment order={order} currency={store.currency} />
				</div>
			</div>
			<OrderTables />
		</>
	);
};

export const Route = createFileRoute("/_admin/orders/$orderId")({
	validateSearch: orderDetailSearchSchema,
	search: { middlewares: [stripSearchParams({ page: 1, activity: 1 })] },
	loaderDeps: ({ search }) => search,
	loader: ({ deps, params }) => readOrder({ data: { ...deps, id: params.orderId } }),
	component: OrderPage,
});
