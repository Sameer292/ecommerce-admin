import { redirectInvalidPages } from "@/lib/pagination-redirect";
import { useListReturn } from "@/components/admin/record-link";
import { listReturnSearchSchema } from "@/lib/list-return";
import { idSchema } from "@/lib/validation";
import { createFileRoute, Link, notFound, stripSearchParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { DeleteRecord } from "@/components/admin/delete-record";
import { DetailHeading } from "@/components/admin/detail-heading";
import { ListPagination } from "@/components/admin/page-controls";
import { FormSection } from "@/components/admin/form-section";
import { buttonVariants } from "@/components/ui/button";
import { can } from "@/features/auth/permissions";
import { CustomerContact } from "@/features/customers/customer-contact";
import { CustomerAnonymize } from "@/features/customers/customer-anonymize";
import { CustomerForm } from "@/features/customers/customer-form";
import { CustomerMerge } from "@/features/customers/customer-merge";
import { CustomerSummary } from "@/features/customers/customer-summary";
import { readCustomer, removeCustomer } from "@/features/customers/customers.functions";
import { OrderTable } from "@/features/orders/order-table";
import { orderSearchSchema } from "@/features/orders/order-validation";

const orderHistorySearchSchema = orderSearchSchema.pick({ page: true, perPage: true, sort: true });

const CustomerOrders = () => {
	const { orders } = Route.useLoaderData();
	const { store } = Route.useRouteContext();
	const search = Route.useSearch();
	const { sort } = search;
	const navigate = Route.useNavigate();
	return (
		<section aria-labelledby="customer-orders" className="flex min-w-0 flex-col gap-3">
			<h2 className="font-heading text-xl font-semibold" id="customer-orders">
				Order history
			</h2>
			<OrderTable
				rows={orders.rows}
				currency={store.currency}
				zone={store.timeZone}
				sorting={{
					value: sort ?? "date.desc",
					onChange: (sort) =>
						navigate({
							search: {
								...search,
								...orderHistorySearchSchema.parse({ ...search, page: 1, sort }),
							},
						}),
				}}
			/>
			<ListPagination
				search={search}
				total={orders.total}
				onSearch={(search) => navigate({ search })}
			/>
		</section>
	);
};

const CustomerPage = () => {
	const { customer, orders, summary } = Route.useLoaderData();
	const { staff, store } = Route.useRouteContext();
	const canEdit = can(staff.role, "manageCommerce");
	const returnHref = useListReturn("/customers");
	const remove = useServerFn(removeCustomer);
	const navigate = Route.useNavigate();
	if (customer.mergedInto)
		return (
			<>
				<DetailHeading
					title="Customer merged"
					description="The orders and storefront identities for this profile moved to another customer."
					back="/customers"
					backLabel="Customers"
				/>
				<Link
					to="/customers/$customerId"
					params={{ customerId: customer.mergedInto }}
					className="w-fit font-medium underline"
				>
					Open the customer profile that was kept
				</Link>
			</>
		);
	if (customer.anonymizedAt)
		return (
			<>
				<DetailHeading
					title="Anonymized customer"
					description="Personal details have been removed."
					back="/customers"
					backLabel="Customers"
				/>
				<CustomerSummary summary={summary} currency={store.currency} zone={store.timeZone} />
				<CustomerOrders />
			</>
		);
	return (
		<>
			<DetailHeading
				title={customer.name}
				description={customer.email}
				back="/customers"
				backLabel="Customers"
			>
				{canEdit && (
					<a
						className={buttonVariants({ variant: "outline" })}
						href={`/api/customers/${customer.id}/export`}
					>
						Export customer data
					</a>
				)}
				{canEdit && (
					<DeleteRecord
						id={customer.id}
						record="customer"
						name={customer.name}
						blockedReason={
							orders.total > 0 ? "This customer has order history and must be retained." : undefined
						}
						onDelete={(data) => remove({ data })}
						onSuccess={() => navigate({ href: returnHref })}
					/>
				)}
			</DetailHeading>
			<FormSection title="Contact">
				<CustomerContact kind="email" value={customer.email} copy />
				{customer.phone && <CustomerContact kind="phone" value={customer.phone} copy />}
			</FormSection>
			<CustomerForm key={customer.id} customer={customer} editable={canEdit} />
			<CustomerSummary summary={summary} currency={store.currency} zone={store.timeZone} />
			<CustomerOrders />
			{canEdit && <CustomerMerge customer={customer} />}
			{canEdit && <CustomerAnonymize customer={customer} />}
		</>
	);
};

export const Route = createFileRoute("/_admin/customers/$customerId")({
	validateSearch: orderHistorySearchSchema.extend(listReturnSearchSchema.shape),
	search: { middlewares: [stripSearchParams({ page: 1 })] },
	loaderDeps: ({ search }) => orderHistorySearchSchema.parse(search),
	loader: async ({ context: { queryClient }, deps, params, location }) => {
		if (!idSchema.safeParse({ id: params.customerId }).success) throw notFound();
		const data = await queryClient.query({
			queryKey: ["customer", params.customerId, deps],
			queryFn: ({ signal }) => readCustomer({ data: { id: params.customerId, ...deps }, signal }),
		});
		redirectInvalidPages(location.pathname, { ...location.search, ...deps }, data.orders.total);
		return data;
	},
	component: CustomerPage,
});
