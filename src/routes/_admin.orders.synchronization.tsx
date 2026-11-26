import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { DetailHeading } from "@/components/admin/detail-heading";
import { PageControls } from "@/components/admin/page-controls";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { requireStaff } from "@/features/auth/session.server";
import { listOrderSyncFailures } from "@/features/store-integration/order-sync.server";
import { formatDateTime } from "@/lib/format";
import { pageSearchSchema } from "@/lib/pagination";
import { redirectInvalidPages } from "@/lib/pagination-redirect";

const pagination = pageSearchSchema.pick({ page: true });
const readFailures = createServerFn()
	.validator(pagination)
	.handler(async ({ data }) => {
		await requireStaff();
		return listOrderSyncFailures(data.page);
	});

const Synchronization = () => {
	const { rows, total } = Route.useLoaderData();
	const { store } = Route.useRouteContext();
	const { page } = Route.useSearch();
	const navigate = Route.useNavigate();
	return (
		<>
			<DetailHeading
				title="Synchronization failures"
				description="Retry conflicting or failed order imports and payment updates from the storefront."
				back="/orders"
				backLabel="Orders"
			/>
			{rows.length ? (
				<>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead scope="col">Order</TableHead>
								<TableHead scope="col">Update</TableHead>
								<TableHead scope="col">HTTP status</TableHead>
								<TableHead scope="col">Last attempt ({store.timeZone})</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map((row) => (
								<TableRow key={`${row.operation}/${row.orderNumber}`}>
									<TableCell>
										{row.orderId ? (
											<Link
												to="/orders/$orderId"
												params={{ orderId: row.orderId }}
												className="font-medium underline"
											>
												{row.orderNumber}
											</Link>
										) : (
											row.orderNumber
										)}
									</TableCell>
									<TableCell>
										{row.operation === "import" ? "Order import" : "Payment update"}
									</TableCell>
									<TableCell>{row.status}</TableCell>
									<TableCell>{formatDateTime(row.attemptedAt, store.timeZone)}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					<PageControls
						page={page}
						total={total}
						onPage={(next) => navigate({ search: { page: next } })}
					/>
				</>
			) : (
				<p className="text-sm text-muted-foreground">No unresolved synchronization failures.</p>
			)}
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
