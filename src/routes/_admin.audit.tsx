import { createFileRoute, redirect, stripSearchParams } from "@tanstack/react-router";
import { ClearFilters, DataTable } from "@/components/admin/data-table";
import { ListControls } from "@/components/admin/list-controls";
import type { Column } from "@/components/admin/list.types";
import { PageHeading } from "@/components/admin/page-heading";
import { ListPagination } from "@/components/admin/page-controls";
import { readAudit } from "@/features/audit/audit.functions";
import { can } from "@/features/auth/permissions";
import { formatDateTime } from "@/lib/format";
import { pageSearchDefaults, pageSearchSchema } from "@/lib/pagination";
import { redirectInvalidPages } from "@/lib/pagination-redirect";

type AuditRow = Awaited<ReturnType<typeof readAudit>>["rows"][number];
const subjects: Record<string, string> = {
	products: "Product",
	categories: "Category",
	orders: "Order",
	payment_events: "Payment event",
	staff_user: "Staff account",
};
const actions: Record<string, string> = { insert: "Created", update: "Updated", delete: "Deleted" };

const auditColumns = (zone: string): Column<AuditRow>[] => [
	{
		label: "Date and time",
		cell: (row) => (
			<time dateTime={row.createdAt.toISOString()}>{formatDateTime(row.createdAt, zone)}</time>
		),
		compact: true,
	},
	{ label: "Changed by", cell: (row) => row.actor },
	{
		label: "Record",
		cell: (row) => `${subjects[row.subject] ?? row.subject} · ${row.recordLabel}`,
	},
	{ label: "Action", cell: (row) => actions[row.action] ?? row.action },
	{
		label: "Fields",
		cell: (row) => row.fields.map((field) => field.replaceAll("_", " ")).join(", "),
	},
];

const AuditPage = () => {
	const data = Route.useLoaderData();
	const search = Route.useSearch();
	const { store } = Route.useRouteContext();
	const navigate = Route.useNavigate();
	const onSearch = (next: typeof search) => navigate({ search: next });
	const clear = () => onSearch({ q: "", page: 1, perPage: search.perPage });
	return (
		<>
			<PageHeading
				title="Audit history"
				description={`Catalog, order, payment, and staff changes · ${store.timeZone}`}
			/>
			<ListControls
				search={search}
				placeholder="Search staff, record or field"
				readSearch={(form) => pageSearchSchema.parse(Object.fromEntries(form))}
				onSearch={onSearch}
				onClear={search.q ? clear : undefined}
			/>
			<ListPagination total={data.total} search={search} onSearch={onSearch} />
			<DataTable
				rows={data.rows}
				columns={auditColumns(store.timeZone)}
				label="Audit history"
				empty={search.q ? "No matching changes" : "No changes recorded"}
				emptyAction={search.q ? <ClearFilters onClear={clear} /> : undefined}
			/>
			<ListPagination total={data.total} search={search} onSearch={onSearch} bottom />
		</>
	);
};

export const Route = createFileRoute("/_admin/audit")({
	beforeLoad: ({ context }) => {
		if (!can(context.staff.role, "manageTeam")) throw redirect({ to: "/access-denied" });
	},
	validateSearch: pageSearchSchema,
	search: { middlewares: [stripSearchParams(pageSearchDefaults)] },
	loaderDeps: ({ search }) => search,
	loader: async ({ context: { queryClient }, deps, location }) => {
		const data = await queryClient.fetchQuery({
			queryKey: ["audit", deps],
			queryFn: ({ signal }) => readAudit({ data: deps, signal }),
		});
		redirectInvalidPages(location.pathname, { ...location.search, ...deps }, data.total);
		return data;
	},
	component: AuditPage,
});
