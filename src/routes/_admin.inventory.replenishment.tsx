import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { AdminForm } from "@/components/admin/admin-form";
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
import { can } from "@/features/auth/permissions";
import { requireStaff, withStaffMutation } from "@/features/auth/session.server";
import {
	acknowledgeReplenishment,
	readReplenishmentAlerts,
} from "@/features/inventory/replenishment.server";
import { formatCount, formatDateTime } from "@/lib/format";
import { pageSearchSchema } from "@/lib/pagination";
import { redirectInvalidPages } from "@/lib/pagination-redirect";
import { formDataSchema, idSchema } from "@/lib/validation";
import { mutate } from "@/server/mutation.server";

const pagination = pageSearchSchema.pick({ page: true });
const readAlerts = createServerFn()
	.validator(pagination)
	.handler(async ({ data }) => {
		await requireStaff();
		return readReplenishmentAlerts(data.page);
	});

const acknowledgeAlert = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(({ data }) =>
		withStaffMutation("manageCommerce", (staff) =>
			mutate(idSchema, data, ({ id }) => acknowledgeReplenishment(id, staff.id)),
		),
	);

const ReplenishmentPage = () => {
	const { rows, total } = Route.useLoaderData();
	const { staff, store } = Route.useRouteContext();
	const { page } = Route.useSearch();
	const router = useRouter();
	const save = useServerFn(acknowledgeAlert);
	const navigate = Route.useNavigate();
	return (
		<>
			<DetailHeading
				title="Replenishment alerts"
				description="Review active products whose available stock reached their replenishment threshold."
				back="/inventory"
				backLabel="Inventory"
			/>
			{rows.length ? (
				<>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead scope="col">Product</TableHead>
								<TableHead scope="col">Available</TableHead>
								<TableHead scope="col">Threshold</TableHead>
								<TableHead scope="col">Incoming</TableHead>
								<TableHead scope="col">Opened</TableHead>
								<TableHead scope="col">Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map((row) => (
								<TableRow key={row.id}>
									<TableCell>
										<Link
											to="/inventory/$productId"
											params={{ productId: row.productId }}
											className="font-medium underline"
										>
											{row.name}
										</Link>
										<div className="text-xs text-muted-foreground">{row.sku}</div>
									</TableCell>
									<TableCell>{formatCount(row.availableStock)}</TableCell>
									<TableCell>{formatCount(row.threshold)}</TableCell>
									<TableCell>{formatCount(row.incomingStock)}</TableCell>
									<TableCell>{formatDateTime(row.openedAt, store.timeZone)}</TableCell>
									<TableCell>
										{row.acknowledgedAt ? (
											"Acknowledged"
										) : can(staff.role, "manageCommerce") ? (
											<AdminForm
												onSave={(data) => save({ data })}
												onSuccess={() => router.invalidate()}
												submitLabel="Acknowledge"
												successMessage="Alert acknowledged."
											>
												<input type="hidden" name="id" value={row.id} />
											</AdminForm>
										) : (
											"Needs review"
										)}
									</TableCell>
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
				<p className="text-sm text-muted-foreground">No products currently need replenishment.</p>
			)}
		</>
	);
};

export const Route = createFileRoute("/_admin/inventory/replenishment")({
	validateSearch: pagination,
	loaderDeps: ({ search }) => search,
	loader: async ({ deps, location }) => {
		const result = await readAlerts({ data: deps });
		redirectInvalidPages(location.pathname, deps, result.total);
		return result;
	},
	component: ReplenishmentPage,
});
