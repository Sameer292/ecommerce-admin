import { pageSearchDefaults } from "@/lib/pagination";
import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { PageHeading } from "@/components/admin/page-heading";
import { OrderList } from "@/features/orders/order-list";
import { orderSearchSchema } from "@/features/orders/order-validation";
import { readOrders } from "@/features/orders/orders.functions";

const OrdersPage = () => {
	const data = Route.useLoaderData();
	const search = Route.useSearch();
	const { store } = Route.useRouteContext();
	const navigate = Route.useNavigate();
	return (
		<>
			<PageHeading
				title="Orders"
				description="Review payments, update fulfillment, and track shipments."
			/>
			<OrderList
				{...data}
				search={search}
				currency={store.currency}
				zone={store.timeZone}
				onSearch={(search) => navigate({ search })}
			/>
		</>
	);
};

export const Route = createFileRoute("/_admin/orders/")({
	validateSearch: orderSearchSchema,
	search: { middlewares: [stripSearchParams(pageSearchDefaults)] },
	loaderDeps: ({ search }) => search,
	loader: ({ context: { queryClient }, deps }) =>
		queryClient.fetchQuery({
			queryKey: ["orders", deps],
			queryFn: ({ signal }) => readOrders({ data: deps, signal }),
		}),
	component: OrdersPage,
});
