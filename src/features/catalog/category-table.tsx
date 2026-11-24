import { Link } from "@tanstack/react-router";
import { DataTable } from "@/components/admin/data-table";
import type { Column } from "@/components/admin/list.types";
import { formatCount } from "@/lib/format";
import type { CategoryListRow } from "./catalog.types";

const categoryColumns: Column<CategoryListRow>[] = [
	{
		label: "Category",
		cell: (row) => (
			<Link
				to="/categories/$categoryId"
				params={{ categoryId: row.id }}
				className="font-medium hover:underline"
			>
				{row.name}
			</Link>
		),
	},
	{
		label: "Slug",
		cell: (row) => <span className="text-muted-foreground">{row.slug}</span>,
	},
	{
		label: "Products",
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
}: {
	rows: CategoryListRow[];
	filtered: boolean;
}) => (
	<DataTable
		rows={rows}
		columns={categoryColumns}
		label="Categories"
		empty={filtered ? "No matching categories" : "No categories yet"}
		emptyDescription={
			filtered ? "Try a different search." : "Add categories to organize your catalog."
		}
	/>
);
