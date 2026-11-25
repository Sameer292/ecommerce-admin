import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { formatCount } from "@/lib/format";
import { lastPage, pageOffset, pageSize, pageSizes } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import type { ListSearch } from "./list.types";

type PageControlsProps = { total: number; page: number; onPage: (page: number) => void };

const PageButtons = ({
	page,
	onPage,
	last,
}: Omit<PageControlsProps, "total"> & { last: number }) => (
	<div className="flex flex-wrap items-center gap-2">
		{page > 1 && (
			<Button variant="outline" onClick={() => onPage(1)}>
				First page
			</Button>
		)}
		<Button
			variant="outline"
			aria-label="Previous page"
			disabled={page === 1}
			onClick={() => onPage(page - 1)}
		>
			<HugeiconsIcon icon={ArrowLeft01Icon} />
		</Button>
		<span>
			Page {formatCount(page)} of {formatCount(last)}
		</span>
		<Button
			variant="outline"
			aria-label="Next page"
			disabled={page >= last}
			onClick={() => onPage(page + 1)}
		>
			<HugeiconsIcon icon={ArrowRight01Icon} />
		</Button>
		{page < last && (
			<Button variant="outline" onClick={() => onPage(last)}>
				Last page
			</Button>
		)}
	</div>
);

export const PageControls = ({
	total,
	page,
	onPage,
	size = pageSize,
	bottom = false,
	onSize,
}: PageControlsProps & {
	size?: number;
	bottom?: boolean;
	onSize?: (size: ListSearch["perPage"]) => void;
}) => {
	if (bottom && total === 0) return null;
	const offset = pageOffset(page, size);
	const end = Math.min(offset + size, total);
	const count =
		offset >= total
			? `${formatCount(total)} results`
			: `${formatCount(offset + 1)}–${formatCount(end)} of ${formatCount(total)}`;

	return (
		<nav
			aria-label={total === 0 ? undefined : bottom ? "Pagination below results" : "Pagination"}
			className={cn(
				"flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground",
				total === 0 && "sr-only",
			)}
		>
			<span role={bottom ? undefined : "status"} aria-atomic={bottom ? undefined : true}>
				{total === 0 ? "No results" : count}
			</span>
			<div className="flex flex-wrap items-center gap-2">
				{onSize && total > 0 && (
					<NativeSelect
						aria-label="Rows per page"
						value={size}
						onChange={(event) => {
							const selected = pageSizes.find((size) => String(size) === event.currentTarget.value);
							onSize(selected === pageSize ? undefined : selected);
						}}
					>
						{pageSizes.map((size) => (
							<NativeSelectOption key={size} value={size}>
								{size} per page
							</NativeSelectOption>
						))}
					</NativeSelect>
				)}
				{(total > size || page > 1) && (
					<PageButtons page={page} onPage={onPage} last={lastPage(total, size)} />
				)}
			</div>
		</nav>
	);
};

export const ListPagination = <Search extends ListSearch>({
	total,
	search,
	onSearch,
	bottom,
}: {
	total: number;
	search: Search;
	onSearch: (search: Search) => void;
	bottom?: boolean;
}) => (
	<PageControls
		total={total}
		page={search.page}
		size={search.perPage}
		bottom={bottom}
		onPage={(page) => onSearch({ ...search, page })}
		onSize={bottom ? undefined : (perPage) => onSearch({ ...search, page: 1, perPage })}
	/>
);
