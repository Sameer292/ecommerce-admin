import { useEffect, useId, useRef, useState } from "react";
import type * as React from "react";
import { cn } from "cn";

const Table = ({
	className,
	scrollLabel,
	...props
}: React.ComponentProps<"table"> & { scrollLabel?: string }) => {
	const container = useRef<HTMLElement>(null);
	const table = useRef<HTMLTableElement>(null);
	const hintId = useId();
	const [overflow, setOverflow] = useState(false);
	useEffect(() => {
		const region = container.current;
		const content = table.current;
		if (!scrollLabel || !region || !content) return;
		const update = () => setOverflow(region.scrollWidth > region.clientWidth);
		const resize = new ResizeObserver(update);
		resize.observe(region);
		resize.observe(content);
		update();
		return () => resize.disconnect();
	}, [scrollLabel]);
	return (
		<>
			<section
				data-slot="table-container"
				ref={container}
				className="relative w-full overflow-x-auto focus-visible:outline-inset focus-visible:outline-ring"
				aria-label={overflow ? scrollLabel : undefined}
				aria-describedby={overflow ? hintId : undefined}
				tabIndex={overflow ? 0 : undefined}
			>
				<table
					ref={table}
					data-slot="table"
					className={cn("w-full caption-bottom text-sm", className)}
					{...props}
				/>
			</section>
			{overflow && (
				<p id={hintId} className="border-t px-3 py-1.5 text-xs text-muted-foreground">
					Scroll horizontally to see more columns.
				</p>
			)}
		</>
	);
};

const TableHeader = ({ className, ...props }: React.ComponentProps<"thead">) => {
	return <thead data-slot="table-header" className={cn("[&_tr]:border-b", className)} {...props} />;
};

const TableBody = ({ className, ...props }: React.ComponentProps<"tbody">) => {
	return (
		<tbody
			data-slot="table-body"
			className={cn("[&_tr:last-child]:border-0", className)}
			{...props}
		/>
	);
};

const TableFooter = ({ className, ...props }: React.ComponentProps<"tfoot">) => {
	return (
		<tfoot
			data-slot="table-footer"
			className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
			{...props}
		/>
	);
};

const TableRow = ({ className, ...props }: React.ComponentProps<"tr">) => {
	return (
		<tr
			data-slot="table-row"
			className={cn(
				"border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
				className,
			)}
			{...props}
		/>
	);
};

const TableHead = ({ className, ...props }: React.ComponentProps<"th">) => {
	return (
		<th
			data-slot="table-head"
			className={cn(
				"h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
				className,
			)}
			{...props}
		/>
	);
};

const TableCell = ({ className, ...props }: React.ComponentProps<"td">) => {
	return (
		<td
			data-slot="table-cell"
			className={cn("p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0", className)}
			{...props}
		/>
	);
};

const TableCaption = ({ className, ...props }: React.ComponentProps<"caption">) => {
	return (
		<caption
			data-slot="table-caption"
			className={cn("mt-4 text-sm text-muted-foreground", className)}
			{...props}
		/>
	);
};

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
