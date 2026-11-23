import { Link } from "@tanstack/react-router";
import { DataTable } from "@/components/admin/data-table";
import type { Column } from "@/components/admin/list.types";
import { formatCount, formatMoney } from "@/lib/format";
import type { ProductListRow } from "./catalog.types";
import { ProductPhoto, ProductStatus } from "./product-labels";

const ProductName = ({ product }: { product: ProductListRow }) => (
	<div className="flex items-center gap-3">
		<ProductPhoto imageUrl={product.imageUrl} />
		<div className="flex min-w-0 flex-col">
			<Link
				to="/products/$productId"
				params={{ productId: product.id }}
				className="max-w-48 truncate font-medium hover:underline sm:max-w-64"
			>
				{product.name}
			</Link>
			<span className="text-xs text-muted-foreground">{product.sku}</span>
		</div>
	</div>
);

const productColumns = (currency: string): Column<ProductListRow>[] => [
	{ label: "Product", cell: (product) => <ProductName product={product} /> },
	{
		label: "Category",
		cell: (product) => product.categoryName ?? "Uncategorized",
	},
	{
		label: "Status",
		cell: (product) => <ProductStatus status={product.status} />,
	},
	{
		label: "Price",
		className: "text-right tabular-nums",
		cell: (product) => formatMoney(product.priceMinor, currency),
	},
	{
		label: "In stock",
		className: "text-right tabular-nums",
		cell: (product) => formatCount(product.stock),
	},
];

export const ProductTable = ({
	rows,
	currency,
	filtered,
}: {
	rows: ProductListRow[];
	currency: string;
	filtered: boolean;
}) => (
	<DataTable
		columns={productColumns(currency)}
		rows={rows}
		label="Products"
		empty={filtered ? "No matching products" : "No products yet"}
		emptyDescription={
			filtered
				? "Try another search or clear the filters."
				: "Products will appear here when you add them."
		}
	/>
);
