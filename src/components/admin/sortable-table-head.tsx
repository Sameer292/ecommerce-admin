import { ArrowDown01Icon, ArrowUp01Icon, UnfoldMoreIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { TableHead } from "@/components/ui/table";
import { nextSort, sortColumn, type Sort } from "@/lib/sort";
import type { TableSorting } from "./list.types";

type HeaderProps = { label: string; sort?: Sort; sorting?: TableSorting; className: string };

export const SortableTableHead = ({ label, sort, sorting, className }: HeaderProps) => {
	if (!sort || !sorting)
		return (
			<TableHead scope="col" className={className}>
				{label}
			</TableHead>
		);
	const active = sortColumn(sort) === sortColumn(sorting.value);
	const ascending = sorting.value.endsWith(".asc");
	const icon = !active ? UnfoldMoreIcon : ascending ? ArrowUp01Icon : ArrowDown01Icon;
	return (
		<TableHead
			scope="col"
			className={className}
			aria-sort={active ? (ascending ? "ascending" : "descending") : undefined}
		>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="-ml-2 h-8 justify-start px-2 text-left font-medium"
				onClick={() => sorting.onChange(nextSort(sorting.value, sort))}
			>
				{label}
				<HugeiconsIcon icon={icon} data-icon="inline-end" aria-hidden />
			</Button>
		</TableHead>
	);
};
