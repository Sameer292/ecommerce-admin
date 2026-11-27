import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { DetailHeading } from "@/components/admin/detail-heading";
import { ListPagination } from "@/components/admin/page-controls";
import { DataTable } from "@/components/admin/data-table";
import { requireStaff } from "@/features/auth/session.server";
import { listOrderSyncFailures } from "@/features/store-integration/order-sync.server";
import { formatDateTime } from "@/lib/format";
import { pageSearchSchema } from "@/lib/pagination";
import { redirectInvalidPages } from "@/lib/pagination-redirect";

const pagination = pageSearchSchema.pick({ page: true, perPage: true });
const readFailures = createServerFn()
	.validator(pagination)
	.handler(async ({ data }) => {
		await requireStaff();
		return listOrderSyncFailures(data.page, data.perPage);
	});

const Synchronization = () => {
	const { rows, total } = Route.useLoaderData();
	const { store } = Route.useRouteContext();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	return (
		<>
			<DetailHeading
				title="Synchronization failures"
				description="Retry conflicting or failed order imports and payment updates from the storefront."
				back="/orders"
				backLabel="Orders"
			/>
			<DataTable
				label="Synchronization failures"
				empty="No unresolved synchronization failures."
				rows={rows.map((row) => ({ ...row, id: `${row.operation}/${row.orderNumber}` }))}
				columns={[
					{
						label: "Order",
						cell: (row) =>
							row.orderId ? (
								<Link
									to="/orders/$orderId"
									params={{ orderId: row.orderId }}
									className="font-medium hover:underline"
								>
									{row.orderNumber}
								</Link>
							) : (
								row.orderNumber
							),
					},
					{
						label: "Update",
						cell: (row) => (row.operation === "import" ? "Order import" : "Payment update"),
					},
					{ label: "HTTP status", compact: true, cell: (row) => row.status },
					{
						label: `Last attempt (${store.timeZone})`,
						cell: (row) => formatDateTime(row.attemptedAt, store.timeZone),
					},
				]}
			/>
			<ListPagination total={total} search={search} onSearch={(search) => navigate({ search })} />
		</>
	);
};

export const Route = createFileRoute("/_admin/orders/synchronization")({
	validateSearch: pagination,
	loaderDeps: ({ search }) => search,
	loader: async ({ deps, location }) => {
		const result = await readFailures({ data: deps });
		redirectInvalidPages(location.pathname, deps, result.total);
		return result;
	},
	component: Synchronization,
});
