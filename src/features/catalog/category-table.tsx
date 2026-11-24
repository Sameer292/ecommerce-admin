import { Link } from "@tanstack/react-router";
import { DataTable } from "@/components/admin/data-table";
import type { Column, TableSorting } from "@/components/admin/list.types";
import { formatCount } from "@/lib/format";
import type { CategoryListRow } from "./catalog.types";
import { CategoryIcon } from "./category-icon";

const categoryColumns: Column<CategoryListRow>[] = [
	{
		label: "Category",
		sort: "name.asc",

		cell: (row) => (
			<Link
				to="/categories/$categoryId"
				params={{ categoryId: row.id }}
				className="inline-flex items-center gap-4 font-medium hover:underline"
			>
				<CategoryIcon icon={row.icon} />
				{row.name}
			</Link>
		),
	},
	{
		label: "Slug",
		sort: "slug.asc",
		cell: (row) => <span className="text-muted-foreground">{row.slug}</span>,
	},
	{
		label: "Products",
		sort: "count.desc",
		className: "text-center",
		cell: (row) => (
			<Link
				to="/products"
				search={{ category: row.id, q: "", page: 1 }}
				className="tabular-nums hover:underline"
				aria-label={`View ${row.name} products`}
			>
				{formatCount(row.productCount)}
			</Link>
		),
	},
];

export const CategoryTable = ({
	rows,
	filtered,
	sorting,
}: {
	rows: CategoryListRow[];
	filtered: boolean;
	sorting: TableSorting;
}) => (
	<DataTable
		sorting={sorting}
		rows={rows}
		columns={categoryColumns}
		label="Categories"
		empty={filtered ? "No matching categories" : "No categories yet"}
		emptyDescription={
			filtered ? "Try a different search." : "Add categories to organize your catalog."
		}
	/>
);
