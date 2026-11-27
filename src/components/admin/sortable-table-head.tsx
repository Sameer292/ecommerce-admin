import { ArrowDown01Icon, ArrowUp01Icon, UnfoldMoreIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type HeaderProps = {
	children: ReactNode;
	direction: false | "asc" | "desc";
	onSort?: () => void;
	className: string;
};

export const SortableTableHead = ({ children, direction, onSort, className }: HeaderProps) => {
	const icon =
		direction === "asc" ? ArrowUp01Icon : direction === "desc" ? ArrowDown01Icon : UnfoldMoreIcon;
	return (
		<TableHead
			scope="col"
			className={className}
			aria-sort={direction ? (direction === "asc" ? "ascending" : "descending") : undefined}
		>
			{onSort ? (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className={cn(
						"-mx-2 px-2 text-xs hover:bg-background/75",
						direction && "text-foreground",
					)}
					onClick={onSort}
				>
					{children}
					<HugeiconsIcon icon={icon} data-icon="inline-end" aria-hidden />
				</Button>
			) : (
				children
			)}
		</TableHead>
	);
};
