import {
	rowSortingFeature,
	tableFeatures,
	useTable,
	type CellContext,
	type ColumnDef,
} from "@tanstack/react-table";
import { useMemo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { nextSort, sortColumn } from "@/lib/sort";
import { cn } from "@/lib/utils";
import type { Column, DataTableProps } from "./list.types";
import { SortableTableHead } from "./sortable-table-head";

const columnWidth = (compact?: boolean) =>
	compact ? "w-[12%] whitespace-nowrap" : "min-w-24 whitespace-normal wrap-normal";

export const ClearFilters = ({ onClear }: { onClear: () => void }) => (
	<Button type="button" variant="outline" onClick={onClear}>
		Clear filters
	</Button>
);

const TableEmpty = ({
	title,
	description,
	action,
	compact,
}: {
	title: string;
	description?: string;
	action?: ReactNode;
	compact?: boolean;
}) => (
	<Empty className={compact ? "py-3 text-left items-start" : "py-11"}>
		<EmptyHeader>
			<EmptyTitle>{title}</EmptyTitle>
			{description && <EmptyDescription>{description}</EmptyDescription>}
		</EmptyHeader>
		{action && <EmptyContent>{action}</EmptyContent>}
	</Empty>
);

const features = tableFeatures({ rowSortingFeature });

const columnId = <Row,>({ label, sort }: Column<Row>) => (sort ? sortColumn(sort) : label);

const TableContents = <Row extends { id: string }>({
	columns,
	rows,
	label,
	sorting,
}: Pick<DataTableProps<Row>, "columns" | "rows" | "label" | "sorting">) => {
	const definitions = useMemo<ColumnDef<typeof features, Row>[]>(
		() =>
			columns.map((column) => ({
				id: columnId(column),
				header: column.label,
				cell: ({ row }: CellContext<typeof features, Row>) => column.cell(row.original),
			})),
		[columns],
	);
	const styles = new Map<string, Pick<Column<Row>, "compact" | "className" | "sort">>(
		columns.map((column) => [columnId(column), column]),
	);
	const table = useTable({
		features,
		data: rows,
		columns: definitions,
		getRowId: (row) => row.id,
		manualSorting: true,
		state: {
			sorting: sorting
				? [{ id: sortColumn(sorting.value), desc: sorting.value.endsWith(".desc") }]
				: [],
		},
	});

	return (
		<Table scrollLabel={label}>
			<TableCaption className="sr-only">{label}</TableCaption>
			<TableHeader className="sticky top-0 z-10 bg-muted">
				{table.getHeaderGroups().map((group) => (
					<TableRow key={group.id} className="hover:bg-transparent">
						{group.headers.map((header) => {
							const column = styles.get(header.column.id);
							const sort = column?.sort;
							return (
								<SortableTableHead
									key={header.id}
									direction={header.column.getIsSorted()}
									onSort={
										sort && sorting
											? () => sorting.onChange(nextSort(sorting.value, sort))
											: undefined
									}
									className={cn(
										"h-11 px-4 text-xs font-medium text-muted-foreground",
										columnWidth(column?.compact),
										column?.className,
									)}
								>
									<table.FlexRender header={header} />
								</SortableTableHead>
							);
						})}
					</TableRow>
				))}
			</TableHeader>
			<TableBody>
				{table.getRowModel().rows.map((row) => (
					<TableRow key={row.id} className="border-border/65 focus-within:bg-muted/60">
						{row.getAllCells().map((cell) => {
							const column = styles.get(cell.column.id);
							return (
								<TableCell
									key={cell.id}
									className={cn(
										"h-12 px-4 py-2.5 text-left",
										columnWidth(column?.compact),
										column?.className,
									)}
								>
									<table.FlexRender cell={cell} />
								</TableCell>
							);
						})}
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
};

export const DataTable = <Row extends { id: string }>({
	empty,
	emptyDescription,
	emptyAction,
	compactEmpty,
	...table
}: DataTableProps<Row>) => (
	<div className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-xs">
		{table.rows.length > 0 ? (
			<TableContents {...table} />
		) : (
			<TableEmpty
				title={empty}
				description={emptyDescription}
				action={emptyAction}
				compact={compactEmpty}
			/>
		)}
	</div>
);
