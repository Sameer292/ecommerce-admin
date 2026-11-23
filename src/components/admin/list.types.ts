import type { ReactNode } from "react";

export type Column<Row> = {
	label: string;
	cell: (row: Row) => ReactNode;
	className?: string;
};

export type ListPage<Row> = { rows: Row[]; total: number };

export type DataTableProps<Row> = {
	columns: Column<Row>[];
	rows: Row[];
	label: string;
	empty: string;
	emptyDescription?: string;
};
