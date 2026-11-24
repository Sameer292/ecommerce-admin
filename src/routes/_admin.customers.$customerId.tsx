import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { DeleteRecord } from "@/components/admin/delete-record";
import { DetailHeading } from "@/components/admin/detail-heading";
import { PageControls } from "@/components/admin/page-controls";
import { can } from "@/features/auth/permissions";
import { CustomerForm } from "@/features/customers/customer-form";
import { readCustomer, removeCustomer } from "@/features/customers/customers.functions";
import { OrderTable } from "@/features/orders/order-table";
import { orderSearchSchema } from "@/features/orders/order-validation";

const orderHistorySearchSchema = orderSearchSchema.pick({ page: true, sort: true });

const CustomerOrders = () => {
	const { orders } = Route.useLoaderData();
	const { store } = Route.useRouteContext();
	const search = Route.useSearch();
	const { page, sort } = search;
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
						navigate({ search: orderHistorySearchSchema.parse({ page: 1, sort }) }),
				}}
			/>
			<PageControls
				page={page}
				total={orders.total}
				onPage={(page) => navigate({ search: { ...search, page } })}
			/>
		</section>
	);
};

const CustomerPage = () => {
	const { customer } = Route.useLoaderData();
	const { staff } = Route.useRouteContext();
	const canEdit = can(staff.role, "manageCommerce");
	const remove = useServerFn(removeCustomer);
	const navigate = Route.useNavigate();
	return (
		<>
			<DetailHeading
				title={customer.name}
				description={customer.email}
				back="/customers"
				backLabel="Customers"
			>
				{canEdit && (
					<DeleteRecord
						id={customer.id}
						record="customer"
						onDelete={(data) => remove({ data })}
						onSuccess={() => navigate({ to: "/customers" })}
					/>
				)}
			</DetailHeading>
			<CustomerForm key={customer.id} customer={customer} editable={canEdit} />
			<CustomerOrders />
		</>
	);
};

export const Route = createFileRoute("/_admin/customers/$customerId")({
	validateSearch: orderHistorySearchSchema,
	search: { middlewares: [stripSearchParams({ page: 1 })] },
	loaderDeps: ({ search }) => search,
	loader: ({ deps, params }) => readCustomer({ data: { id: params.customerId, ...deps } }),
	component: CustomerPage,
});
