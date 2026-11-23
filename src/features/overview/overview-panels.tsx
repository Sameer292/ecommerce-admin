import { ArrowUpRight01Icon, BoxesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { StockStatus } from "@/features/catalog/product-labels";
import type { OrderRow } from "@/features/orders/order.types";
import { OrderTable } from "@/features/orders/order-table";
import { formatCount } from "@/lib/format";

type StockRow = { id: string; name: string; sku: string; stock: number; lowStockThreshold: number };

const StockEmpty = () => (
	<Empty className="py-6">
		<EmptyHeader>
			<EmptyMedia variant="icon">
				<HugeiconsIcon icon={BoxesIcon} aria-hidden />
			</EmptyMedia>
			<EmptyTitle>No low-stock products</EmptyTitle>
			<EmptyDescription>Active products are above their stock thresholds.</EmptyDescription>
		</EmptyHeader>
	</Empty>
);

const StockLine = ({ product }: { product: StockRow }) => (
	<li className="flex min-w-0 items-center gap-3 py-3">
		<div
			aria-hidden
			className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted/60 text-muted-foreground"
		>
			<HugeiconsIcon icon={BoxesIcon} className="size-4" />
		</div>
		<div className="flex min-w-0 flex-1 flex-col gap-0.5">
			<Link
				to="/inventory/$productId"
				params={{ productId: product.id }}
				className="truncate text-sm font-medium hover:underline"
			>
				{product.name}
			</Link>
			<span className="truncate text-xs text-muted-foreground">
				{product.sku} · {formatCount(product.stock)} left
			</span>
		</div>
		<StockStatus {...product} />
	</li>
);

export const StockWatch = ({ stock }: { stock: StockRow[] }) => (
	<Card size="sm" className="min-w-0 gap-3 p-4 sm:p-5">
		<CardHeader className="flex flex-row items-start justify-between gap-2 px-0">
			<div className="flex flex-col gap-1">
				<h2 className="font-heading text-lg font-semibold">Low stock</h2>
				<CardDescription>Active products at or below threshold</CardDescription>
			</div>
			<Link
				to="/inventory"
				className={buttonVariants({ variant: "ghost", size: "icon" })}
				aria-label="View inventory"
			>
				<HugeiconsIcon icon={ArrowUpRight01Icon} />
			</Link>
		</CardHeader>
		<CardContent className="px-0">
			{stock.length > 0 ? (
				<ul className="divide-y">
					{stock.map((product) => (
						<StockLine key={product.id} product={product} />
					))}
				</ul>
			) : (
				<StockEmpty />
			)}
		</CardContent>
	</Card>
);

export const RecentOrders = ({
	rows,
	currency,
	zone,
}: {
	rows: OrderRow[];
	currency: string;
	zone: string;
}) => (
	<section aria-labelledby="recent-orders" className="flex min-w-0 flex-col gap-3">
		<div className="flex items-center justify-between gap-2">
			<h2 id="recent-orders" className="font-heading text-xl font-semibold tracking-tight">
				Recent orders
			</h2>
			<Link to="/orders" className={buttonVariants({ variant: "outline", size: "lg" })}>
				View orders
				<HugeiconsIcon icon={ArrowUpRight01Icon} data-icon="inline-end" />
			</Link>
		</div>
		<OrderTable rows={rows} currency={currency} zone={zone} />
	</section>
);
