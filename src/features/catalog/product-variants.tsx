import { Link } from "@tanstack/react-router";
import { FormSection } from "@/components/admin/form-section";
import { buttonVariants } from "@/components/ui/button";
import { formatCount, formatMoney } from "@/lib/format";
import type { listProductVariants } from "./products.server";
import { ProductStatus } from "./product-labels";

export const ProductVariants = ({
	id,
	rows,
	currency,
	editable,
}: {
	id: string;
	rows: Awaited<ReturnType<typeof listProductVariants>>;
	currency: string;
	editable: boolean;
}) => (
	<FormSection title="Variants">
		{rows.length ? (
			<ul className="divide-y text-sm">
				{rows.map((row) => (
					<li
						key={row.id}
						className="grid grid-cols-2 gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center"
					>
						<div>
							<Link
								to="/products/$productId"
								params={{ productId: row.id }}
								className="font-medium underline underline-offset-2"
							>
								{row.variantOptions.map(({ name, value }) => `${name} ${value}`).join(" · ")}
							</Link>
							<p className="text-muted-foreground">{row.sku}</p>
						</div>
						<ProductStatus status={row.status} />
						<span className="tabular-nums">{formatMoney(row.priceMinor, currency)}</span>
						<span className="tabular-nums">{formatCount(row.availableStock)} available</span>
					</li>
				))}
			</ul>
		) : (
			<p className="text-sm text-muted-foreground">No variants yet.</p>
		)}
		{editable && (
			<Link
				to="/products/new"
				search={{ variantOf: id }}
				className={buttonVariants({ variant: "outline", className: "w-fit" })}
			>
				Add variant
			</Link>
		)}
	</FormSection>
);
