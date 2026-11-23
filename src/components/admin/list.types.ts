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

export type ListSearch = { page: number; q: string };

export type ListControlsProps<Search extends ListSearch> = {
	search: Search;
	placeholder: string;
	children?: ReactNode;
	readSearch: (form: FormData) => Search | null;
	onSearch: (search: Search) => void;
	onClear?: () => void;
};

export type ListFormProps = {
	query: string;
	placeholder: string;
	children?: ReactNode;
	onSearch: (form: FormData) => void;
	onClear?: () => void;
};
