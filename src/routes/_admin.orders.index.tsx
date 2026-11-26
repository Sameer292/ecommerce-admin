import { redirectInvalidPages } from "@/lib/pagination-redirect";
import { pageSearchDefaults } from "@/lib/pagination";
import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { PageHeading } from "@/components/admin/page-heading";
import { can } from "@/features/auth/permissions";
import { OrderList } from "@/features/orders/order-list";
import { orderSearchSchema } from "@/features/orders/order-validation";
import { readOrders } from "@/features/orders/orders.functions";

const OrdersPage = () => {
	const data = Route.useLoaderData();
	const search = Route.useSearch();
	const { store, staff } = Route.useRouteContext();
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
				editable={can(staff.role, "manageCommerce")}
				onSearch={(search) => navigate({ search })}
			/>
		</>
	);
};

export const Route = createFileRoute("/_admin/orders/")({
	validateSearch: orderSearchSchema,
	search: { middlewares: [stripSearchParams(pageSearchDefaults)] },
	loaderDeps: ({ search }) => search,
	loader: async ({ context: { queryClient }, deps, location }) => {
		const data = await queryClient.fetchQuery({
			queryKey: ["orders", deps],
			queryFn: ({ signal }) => readOrders({ data: deps, signal }),
		});
		redirectInvalidPages(location.pathname, { ...location.search, ...deps }, data.total);
		return data;
	},
	component: OrdersPage,
});
