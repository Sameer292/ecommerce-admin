import { listSorting } from "@/components/admin/table-sorting";
import { RecordLink } from "@/components/admin/record-link";
import { ClearFilters, DataTable } from "@/components/admin/data-table";
import { ListControls } from "@/components/admin/list-controls";
import type { Column, ListPage } from "@/components/admin/list.types";
import { ListPagination } from "@/components/admin/page-controls";
import { formatDate, formatMoney } from "@/lib/format";
import { defaultAddedSort } from "@/lib/sort";
import { CustomerContact } from "./customer-contact";
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
				className="block max-w-48 truncate font-medium hover:underline"
				title={row.name}
			>
				{row.name}
			</RecordLink>
		),
	},
	{
		label: "Email",
		sort: "email.asc",
		cell: (row) => <CustomerContact kind="email" value={row.email} />,
	},
	{
		label: "Phone",
		className: "min-w-40",
		cell: (row) => <CustomerContact kind="phone" value={row.phone} />,
	},
	{
		label: "Added",
		sort: defaultAddedSort,
		className: "min-w-35 text-center",
		cell: (row) => formatDate(row.createdAt, zone),
	},
	{
		label: "Total purchases",
		sort: "purchases.desc",
		className: "text-center tabular-nums",
		cell: (row) => formatMoney(row.totalPurchasesMinor, currency),
	},
];

type CustomerListProps = ListPage<CustomerRow> & {
	search: CustomerSearch;
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
}: CustomerListProps) => (
	<div className="flex flex-col gap-4">
		<ListControls
			search={search}
			placeholder="Search name, email, or phone"
			readSearch={(form) => customerSearchSchema.parse(Object.fromEntries(form))}
			onSearch={onSearch}
			onClear={
				search.q
					? () => onSearch({ q: "", page: 1, sort: search.sort, perPage: search.perPage })
					: undefined
			}
		/>
		<DataTable
			sorting={listSorting(search, defaultAddedSort, customerSearchSchema, onSearch)}
			rows={rows}
			columns={customerColumns(zone, currency)}
			label="Customers"
			emptyAction={
				search.q ? (
					<ClearFilters
						onClear={() => onSearch({ q: "", page: 1, sort: search.sort, perPage: search.perPage })}
					/>
				) : undefined
			}
			empty={search.q || search.page > 1 ? "No matching customers" : "No customers yet"}
		/>
		<ListPagination total={total} search={search} onSearch={onSearch} />
	</div>
);
