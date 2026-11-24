import { Link } from "@tanstack/react-router";
import { DataTable } from "@/components/admin/data-table";
import type { Column, TableSorting } from "@/components/admin/list.types";
import { formatCount, formatDate, formatMoney } from "@/lib/format";
import type { ProductListRow } from "./catalog.types";
import { ProductPhoto, ProductStatus } from "./product-labels";

const ProductName = ({ product }: { product: ProductListRow }) => (
	<div className="flex items-center gap-3">
		<ProductPhoto imageUrl={product.imageUrl} />
		<div className="flex min-w-0 flex-col">
			<Link
				to="/products/$productId"
				params={{ productId: product.id }}
				className="font-medium hover:underline"
			>
				{product.name}
			</Link>
			<span className="text-xs text-muted-foreground">{product.sku}</span>
		</div>
	</div>
);

const productColumns = (currency: string, zone: string): Column<ProductListRow>[] => [
	{
		label: "Product",
		sort: "name.asc",
		className: "min-w-30",
		cell: (product) => <ProductName product={product} />,
	},
	{
		label: "Category",
		sort: "category.asc",
		cell: (product) => product.categoryName ?? "Uncategorized",
	},
	{
		label: "Status",
		cell: (product) => <ProductStatus status={product.status} />,
	},
	{
		label: "Price",
		sort: "price.asc",
		className: "tabular-nums",
		cell: (product) => formatMoney(product.priceMinor, currency),
	},
	{
		label: "In stock",
		sort: "stock.desc",
		className: "tabular-nums",
		cell: (product) => formatCount(product.stock),
	},
	{ label: "Added", sort: "date.desc", cell: (product) => formatDate(product.createdAt, zone) },
];

export const ProductTable = ({
	rows,
	currency,
	zone,
	filtered,
	sorting,
}: {
	rows: ProductListRow[];
	currency: string;
	zone: string;
	filtered: boolean;
	sorting: TableSorting;
}) => (
	<DataTable
		sorting={sorting}
		columns={productColumns(currency, zone)}
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
