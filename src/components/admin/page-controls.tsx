import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/format";
import { lastPage, pageOffset, pageSize } from "@/lib/pagination";

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
	</div>
);

export const PageControls = ({ total, page, onPage }: PageControlsProps) => {
	const offset = pageOffset(page);
	const end = Math.min(offset + pageSize, total);
	const count =
		offset >= total
			? `${formatCount(total)} results`
			: `${formatCount(offset + 1)}–${formatCount(end)} of ${formatCount(total)}`;

	return (
		<nav
			aria-label="Pagination"
			className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"
		>
			<span role="status" aria-atomic="true">
				{count}
			</span>
			{(total > pageSize || page > 1) && (
				<PageButtons page={page} onPage={onPage} last={lastPage(total)} />
			)}
		</nav>
	);
};
