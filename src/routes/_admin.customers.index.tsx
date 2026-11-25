import { pageSearchDefaults } from "@/lib/pagination";
import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { NewRecord } from "@/components/admin/new-record";
import { PageHeading } from "@/components/admin/page-heading";
import { can } from "@/features/auth/permissions";
import { CustomerList } from "@/features/customers/customer-list";
import { readCustomers } from "@/features/customers/customers.functions";
import { customerSearchSchema } from "@/features/customers/customer-validation";

const CustomersPage = () => {
	const data = Route.useLoaderData();
	const { store, staff } = Route.useRouteContext();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	return (
		<>
			<PageHeading
				title="Customers"
				description="Find customer records and review their order history."
			>
				{can(staff.role, "manageCommerce") && (
					<NewRecord to="/customers/new" label="Add customer" />
				)}
			</PageHeading>
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
	loader: ({ context: { queryClient }, deps }) =>
		queryClient.fetchQuery({
			queryKey: ["customers", deps],
			queryFn: ({ signal }) => readCustomers({ data: deps, signal }),
		}),
	component: CustomersPage,
});
