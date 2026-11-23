import { Link } from "@tanstack/react-router";
import { DataTable } from "@/components/admin/data-table";
import { ListControls } from "@/components/admin/list-controls";
import type { Column, ListPage } from "@/components/admin/list.types";
import { PageControls } from "@/components/admin/page-controls";
import { StatusBadge } from "@/components/admin/status-badge";
import { roleLabels } from "@/features/auth/permissions";
import { pageSearchSchema } from "@/lib/pagination";
import type { StaffAccount, StaffSearch } from "./team.types";

const teamColumns: Column<StaffAccount>[] = [
	{
		label: "Name",
		cell: (row) => (
			<Link
				to="/team/$staffId"
				params={{ staffId: row.id }}
				className="font-medium hover:underline"
			>
				{row.name}
			</Link>
		),
	},
	{ label: "Email", cell: (row) => <span className="text-muted-foreground">{row.email}</span> },
	{ label: "Role", compact: true, cell: (row) => roleLabels[row.role] },
	{
		label: "Access",
		compact: true,
		cell: (row) => (
			<StatusBadge tone={row.banned ? "danger" : "success"}>
				{row.banned ? "Disabled" : "Active"}
			</StatusBadge>
		),
	},
];

type TeamListProps = ListPage<StaffAccount> & {
	search: StaffSearch;
	onSearch: (search: StaffSearch) => void;
};

export const TeamList = ({ rows, total, search, onSearch }: TeamListProps) => (
	<div className="flex flex-col gap-4">
		<ListControls
			search={search}
			placeholder="Search staff"
			readSearch={(form) => pageSearchSchema.parse(Object.fromEntries(form))}
			onSearch={onSearch}
			onClear={search.q ? () => onSearch({ q: "", page: 1 }) : undefined}
		/>
		<DataTable
			rows={rows}
			columns={teamColumns}
			label="Staff accounts"
			empty={search.q || search.page > 1 ? "No matching staff accounts" : "No staff accounts"}
		/>
		<PageControls
			total={total}
			page={search.page}
			onPage={(page) => onSearch({ ...search, page })}
		/>
	</div>
);
