import { redirectInvalidPages } from "@/lib/pagination-redirect";
import { pageSearchDefaults } from "@/lib/pagination";
import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { PageHeading } from "@/components/admin/page-heading";
import { CustomerList } from "@/features/customers/customer-list";
import { readCustomers } from "@/features/customers/customers.functions";
import { customerSearchSchema } from "@/features/customers/customer-validation";

const CustomersPage = () => {
	const data = Route.useLoaderData();
	const { store } = Route.useRouteContext();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	return (
		<>
			<PageHeading
				title="Customers"
				description="Find customer records and review their order history."
			/>
			<CustomerList
				{...data}
				zone={store.timeZone}
				currency={store.currency}
				search={search}
				onSearch={(search) => navigate({ search })}
			/>
		</>
	);
};

export const Route = createFileRoute("/_admin/customers/")({
	validateSearch: customerSearchSchema,
	search: { middlewares: [stripSearchParams(pageSearchDefaults)] },
	loaderDeps: ({ search }) => search,
	loader: async ({ context: { queryClient }, deps, location }) => {
		const data = await queryClient.query({
			queryKey: ["customers", deps],
			queryFn: ({ signal }) => readCustomers({ data: deps, signal }),
		});
		redirectInvalidPages(location.pathname, { ...location.search, ...deps }, data.total);
		return data;
	},
	component: CustomersPage,
});
