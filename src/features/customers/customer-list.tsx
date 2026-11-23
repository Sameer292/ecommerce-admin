import { Link } from "@tanstack/react-router";
import { DataTable } from "@/components/admin/data-table";
import { ListControls } from "@/components/admin/list-controls";
import type { Column, ListPage } from "@/components/admin/list.types";
import { PageControls } from "@/components/admin/page-controls";
import { formatDate } from "@/lib/format";
import { pageSearchSchema } from "@/lib/pagination";
import type { CustomerRow, CustomerSearch } from "./customer.types";

const customerColumns = (zone: string): Column<CustomerRow>[] => [
	{
		label: "Customer",
		cell: (row) => (
			<Link
				to="/customers/$customerId"
				params={{ customerId: row.id }}
				className="font-medium hover:underline"
			>
				{row.name}
			</Link>
		),
	},
	{ label: "Email", cell: (row) => <span className="text-muted-foreground">{row.email}</span> },
	{ label: "Phone", cell: (row) => row.phone || "—" },
	{ label: "Added", cell: (row) => formatDate(row.createdAt, zone) },
];

type CustomerListProps = ListPage<CustomerRow> & {
	search: CustomerSearch;
	zone: string;
	onSearch: (search: CustomerSearch) => void;
};

export const CustomerList = ({ rows, total, zone, search, onSearch }: CustomerListProps) => (
	<div className="flex flex-col gap-4">
		<ListControls
			key={search.q}
			query={search.q}
			placeholder="Search customers"
			onSearch={(form) => onSearch(pageSearchSchema.parse(Object.fromEntries(form)))}
			onClear={search.q ? () => onSearch({ q: "", page: 1 }) : undefined}
		/>
		<DataTable
			rows={rows}
			columns={customerColumns(zone)}
			label="Customers"
			empty={search.q || search.page > 1 ? "No matching customers" : "No customers yet"}
		/>
		<PageControls
			total={total}
			page={search.page}
			onPage={(page) => onSearch({ ...search, page })}
		/>
	</div>
);
