import { listSorting } from "@/components/admin/table-sorting";
import { RecordLink } from "@/components/admin/record-link";
import { ClearFilters, DataTable } from "@/components/admin/data-table";
import { NewRecord } from "@/components/admin/new-record";
import { ListControls } from "@/components/admin/list-controls";
import type { Column, ListPage } from "@/components/admin/list.types";
import { ListPagination } from "@/components/admin/page-controls";
import { formatDate, formatMoney } from "@/lib/format";
import { customerSearchSchema } from "./customer-validation";
import type { CustomerRow, CustomerSearch } from "./customer.types";

const customerColumns = (zone: string, currency: string): Column<CustomerRow>[] => [
	{
		label: "Customer",
		sort: "name.asc",
		cell: (row) => (
			<RecordLink
				to="/customers/$customerId"
				params={{ customerId: row.id }}
				className="font-medium hover:underline truncate"
			>
				{row.name}
			</RecordLink>
		),
	},
	{
		label: "Email",
		sort: "email.asc",
		cell: (row) => <span className="text-muted-foreground truncate">{row.email}</span>,
	},
	{ label: "Phone", className: "min-w-40", cell: (row) => row.phone || "—" },
	{
		label: "Added",
		sort: "date.desc",
		className: "min-w-35 text-center",
		cell: (row) => formatDate(row.createdAt, zone),
	},
	{
		label: "Total purchases",
		sort: "purchases.desc",
		className: "text-right tabular-nums",
		cell: (row) => formatMoney(row.totalPurchasesMinor, currency),
	},
];

type CustomerListProps = ListPage<CustomerRow> & {
	search: CustomerSearch;
	canCreate: boolean;
	zone: string;
	currency: string;
	onSearch: (search: CustomerSearch) => void;
};

export const CustomerList = ({
	rows,
	total,
	zone,
	currency,
	search,
	onSearch,
	canCreate,
}: CustomerListProps) => (
	<div className="flex flex-col gap-4">
		<ListControls
			search={search}
			placeholder="Search customers"
			readSearch={(form) => customerSearchSchema.parse(Object.fromEntries(form))}
			onSearch={onSearch}
			onClear={
				search.q
					? () => onSearch({ q: "", page: 1, sort: search.sort, perPage: search.perPage })
					: undefined
			}
		/>
		<ListPagination total={total} search={search} onSearch={onSearch} />
		<DataTable
			sorting={listSorting(search, "name.asc", customerSearchSchema, onSearch)}
			rows={rows}
			columns={customerColumns(zone, currency)}
			label="Customers"
			emptyAction={
				search.q ? (
					<ClearFilters
						onClear={() => onSearch({ q: "", page: 1, sort: search.sort, perPage: search.perPage })}
					/>
				) : canCreate ? (
					<NewRecord to="/customers/new" label="Add customer" />
				) : undefined
			}
			empty={search.q || search.page > 1 ? "No matching customers" : "No customers yet"}
		/>
		<ListPagination total={total} search={search} onSearch={onSearch} bottom />
	</div>
);
