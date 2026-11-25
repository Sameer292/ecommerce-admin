import type { ReactNode } from "react";
import type { ListPageSize } from "@/lib/pagination";
import type { Sort } from "@/lib/sort";

export type Column<Row> = {
	label: string;
	cell: (row: Row) => ReactNode;
	compact?: boolean;
	sort?: Sort;
	className?: string;
};

export type ListPage<Row> = { rows: Row[]; total: number };

export type TableSorting = { value: Sort; onChange: (value: Sort) => void };

export type DataTableProps<Row> = {
	columns: Column<Row>[];
	rows: Row[];
	label: string;
	empty: string;
	emptyDescription?: string;
	emptyAction?: ReactNode;
	sorting?: TableSorting;
};

export type ListSearch = { page: number; q: string; sort?: Sort; perPage?: ListPageSize };

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
