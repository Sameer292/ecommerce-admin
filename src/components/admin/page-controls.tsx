import {
	ArrowLeft01Icon,
	ArrowLeftDoubleIcon,
	ArrowRight01Icon,
	ArrowRightDoubleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { formatCount } from "@/lib/format";
import { lastPage, pageOffset, pageSize, pageSizes, type ListPageSize } from "@/lib/pagination";
import type { ListSearch } from "./list.types";

export type PageControlsProps = {
	total: number;
	page: number;
	onPage: (page: number) => void;
	size?: ListPageSize;
	onSize: (size: ListPageSize | undefined) => void;
};
const sizes = pageSizes.map((size) => ({ value: String(size), label: `${size} per page` }));

const PageButtons = ({
	page,
	onPage,
	last,
}: Pick<PageControlsProps, "page" | "onPage"> & { last: number }) => (
	<div className="flex shrink-0 items-center gap-0.5 lg:gap-1.5">
		<Button
			variant="outline"
			size="icon-sm"
			aria-label="First page"
			disabled={page === 1}
			onClick={() => onPage(1)}
		>
			<HugeiconsIcon icon={ArrowLeftDoubleIcon} aria-hidden />
		</Button>
		<Button
			variant="outline"
			size="icon-sm"
			aria-label="Previous page"
			disabled={page === 1}
			onClick={() => onPage(page - 1)}
		>
			<HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden />
		</Button>
		<Button
			variant="outline"
			size="icon-sm"
			aria-label="Next page"
			disabled={page >= last}
			onClick={() => onPage(page + 1)}
		>
			<HugeiconsIcon icon={ArrowRight01Icon} aria-hidden />
		</Button>
		<Button
			variant="outline"
			size="icon-sm"
			aria-label="Last page"
			disabled={page >= last}
			onClick={() => onPage(last)}
		>
			<HugeiconsIcon icon={ArrowRightDoubleIcon} aria-hidden />
		</Button>
	</div>
);

export const PageControls = ({
	total,
	page,
	onPage,
	size = pageSize,
	onSize,
}: PageControlsProps) => {
	if (total === 0)
		return (
			<span role="status" className="sr-only">
				No results
			</span>
		);
	const last = lastPage(total, size);
	const offset = pageOffset(page, size);
	const end = Math.min(offset + size, total);
	const count =
		offset >= total
			? `${formatCount(total)} results`
			: `${formatCount(offset + 1)}–${formatCount(end)} of ${formatCount(total)}`;

	return (
		<nav aria-label="Pagination" className="flex items-center justify-between gap-3 text-sm">
			<span
				role="status"
				aria-atomic="true"
				className="sr-only whitespace-nowrap text-muted-foreground lg:not-sr-only"
			>
				{count}
			</span>
			<div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-1 lg:justify-end lg:gap-3">
				<Select
					items={sizes}
					value={String(size)}
					onValueChange={(value) => {
						const selected = pageSizes.find((size) => String(size) === value);
						onSize(selected === pageSize ? undefined : selected);
					}}
				>
					<SelectTrigger
						aria-label="Rows per page"
						size="sm"
						className="max-lg:gap-1 max-lg:px-1 max-lg:text-xs lg:not-sr-only lg:px-2 sr-only"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent side="top" alignItemWithTrigger={false}>
						<SelectGroup>
							{sizes.map(({ value, label }) => (
								<SelectItem key={value} value={value}>
									{label}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
				<div className="flex flex-row items-center justify-between flex-1 lg:flex-0 gap-4">
					<span className="whitespace-nowrap text-xs font-medium lg:text-sm">
						Page {formatCount(page)} of {formatCount(last)}
					</span>
					<PageButtons page={page} onPage={onPage} last={last} />
				</div>
			</div>
		</nav>
	);
};

export const ListPagination = <Search extends Pick<ListSearch, "page" | "perPage">>({
	total,
	search,
	onSearch,
}: {
	total: number;
	search: Search;
	onSearch: (search: Search) => void;
}) => (
	<PageControls
		total={total}
		page={search.page}
		size={search.perPage}
		onPage={(page) => onSearch({ ...search, page })}
		onSize={(perPage) => onSearch({ ...search, page: 1, perPage })}
	/>
);
