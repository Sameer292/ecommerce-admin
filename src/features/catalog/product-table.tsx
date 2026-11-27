import type { ReactNode } from "react";
import { RecordLink } from "@/components/admin/record-link";
import { DataTable } from "@/components/admin/data-table";
import type { Column, TableSorting } from "@/components/admin/list.types";
import { formatCount, formatDate, formatMoney } from "@/lib/format";
import { defaultAddedSort } from "@/lib/sort";
import type { ProductListRow } from "./catalog.types";
import { ProductPhoto, ProductStatus } from "./product-labels";

const ProductName = ({ product }: { product: ProductListRow }) => (
	<div className="flex items-center gap-3">
		<ProductPhoto imageUrl={product.imageUrl} />
		<div className="flex min-w-0 flex-col">
			<RecordLink
				to="/products/$productId"
				params={{ productId: product.id }}
				title={product.name}
				className="font-medium hover:underline truncate"
			>
				{product.name}
			</RecordLink>
			<span className="text-xs whitespace-nowrap text-muted-foreground">{product.sku}</span>
		</div>
	</div>
);

const productColumns = (currency: string, zone: string): Column<ProductListRow>[] => [
	{
		label: "Product",
		className: "min-w-35",
		sort: "name.asc",
		cell: (product) => <ProductName product={product} />,
	},
	{
		label: "Category",
		sort: "category.asc",
		className: "min-w-35",
		cell: (product) => product.categoryName ?? "Uncategorized",
	},
	{
		label: "Status",
		cell: (product) => <ProductStatus status={product.status} />,
	},
	{
		label: "Price",
		sort: "price.asc",
		className: "text-left tabular-nums",
		cell: (product) => formatMoney(product.priceMinor, currency),
	},
	{
		label: "Available",
		sort: "stock.desc",
		className: "text-center tabular-nums",
		cell: (product) => formatCount(product.availableStock),
	},
	{
		label: "Added",
		sort: defaultAddedSort,
		className: "text-center min-w-35",
		cell: (product) => formatDate(product.createdAt, zone),
	},
];

export const ProductTable = ({
	rows,
	currency,
	zone,
	filtered,
	emptyAction,
	sorting,
}: {
	rows: ProductListRow[];
	currency: string;
	zone: string;
	filtered: boolean;
	emptyAction?: ReactNode;
	sorting: TableSorting;
}) => (
	<DataTable<ProductListRow>
		sorting={sorting}
		columns={productColumns(currency, zone)}
		rows={rows}
		label="Products"
		emptyAction={emptyAction}
		empty={filtered ? "No matching products" : "No products yet"}
		emptyDescription={
			filtered
				? "Try another search or clear the filters."
				: "Products will appear here when you add them."
		}
	/>
);
