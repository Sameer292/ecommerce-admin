import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
import type { ReactNode } from "react";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { DataTableProps } from "./list.types";
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

const DataRows = <Row extends { id: string }>({
	columns,
	rows,
}: Pick<DataTableProps<Row>, "columns" | "rows">) => (
	<TableBody>
		{rows.map((row) => (
			<TableRow key={row.id}>
				{columns.map(({ label, cell, compact, className }) => (
					<TableCell
						key={label}
						className={cn("px-4 py-3", columnWidth(compact), "text-left", className)}
					>
						{cell(row)}
					</TableCell>
				))}
			</TableRow>
		))}
	</TableBody>
);

const TableContents = <Row extends { id: string }>({
	columns,
	rows,
	label,
	sorting,
}: Omit<DataTableProps<Row>, "empty" | "emptyDescription" | "emptyAction">) => (
	<Table scrollLabel={label}>
		<TableCaption className="sr-only">{label}</TableCaption>
		<TableHeader className="sticky top-0 z-10 bg-muted">
			<TableRow>
				{columns.map(({ label, compact, className, sort }) => (
					<SortableTableHead
						key={label}
						label={label}
						sort={sort}
						sorting={sorting}
						className={cn(
							"h-10 px-4 text-xs text-muted-foreground",
							columnWidth(compact),
							"text-left",
							className,
						)}
					/>
				))}
			</TableRow>
		</TableHeader>
		<DataRows columns={columns} rows={rows} />
	</Table>
);

export const DataTable = <Row extends { id: string }>({
	empty,
	emptyDescription,
	emptyAction,
	compactEmpty,
	...table
}: DataTableProps<Row>) => (
	<div className="min-w-0 overflow-hidden rounded-xl border bg-card">
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
