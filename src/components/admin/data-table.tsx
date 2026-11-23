import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { DataTableProps } from "./list.types";

const TableEmpty = ({ title, description }: { title: string; description?: string }) => (
	<Empty className="py-11">
		<EmptyHeader>
			<EmptyTitle>{title}</EmptyTitle>
			{description && <EmptyDescription>{description}</EmptyDescription>}
		</EmptyHeader>
	</Empty>
);

const DataRows = <Row extends { id: string }>({
	columns,
	rows,
}: Pick<DataTableProps<Row>, "columns" | "rows">) => (
	<TableBody>
		{rows.map((row) => (
			<TableRow key={row.id}>
				{columns.map(({ label, cell, className }) => (
					<TableCell key={label} className={cn("px-4 py-3", className)}>
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
}: Omit<DataTableProps<Row>, "empty" | "emptyDescription">) => (
	<Table>
		<TableCaption className="sr-only">{label}</TableCaption>
		<TableHeader className="bg-muted/35">
			<TableRow>
				{columns.map(({ label, className }) => (
					<TableHead
						key={label}
						scope="col"
						className={cn("h-10 px-4 text-xs text-muted-foreground", className)}
					>
						{label}
					</TableHead>
				))}
			</TableRow>
		</TableHeader>
		<DataRows columns={columns} rows={rows} />
	</Table>
);

export const DataTable = <Row extends { id: string }>({
	empty,
	emptyDescription,
	...table
}: DataTableProps<Row>) => (
	<div className="min-w-0 overflow-hidden rounded-xl border bg-card">
		{table.rows.length > 0 ? (
			<TableContents {...table} />
		) : (
			<TableEmpty title={empty} description={emptyDescription} />
		)}
	</div>
);
