import { listSorting } from "@/components/admin/table-sorting";
import { RecordLink } from "@/components/admin/record-link";
import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";
import { ClearFilters, DataTable } from "@/components/admin/data-table";
import { ListControls } from "@/components/admin/list-controls";
import type { Column, ListPage } from "@/components/admin/list.types";
import { ListPagination } from "@/components/admin/page-controls";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
	productStatusLabels,
	productStatuses,
	stockFilterLabels,
	stockFilters,
} from "@/features/catalog/catalog-options";
import type { ProductListRow } from "@/features/catalog/catalog.types";
import { ProductStatus, StockStatus } from "@/features/catalog/product-labels";
import { formatCount } from "@/lib/format";
import { inventorySearchSchema } from "./inventory-validation";
import type { InventorySearch } from "./inventory.types";

const inventoryColumns: Column<ProductListRow>[] = [
	{
		label: "Product",
		sort: "name.asc",
		cell: (row) => (
			<RecordLink
				to="/inventory/$productId"
				params={{ productId: row.id }}
				className="font-medium hover:underline truncate"
			>
				{row.name}
			</RecordLink>
		),
	},
	{
		label: "SKU",
		sort: "sku.asc",
		cell: (row) => <span className="text-muted-foreground truncate">{row.sku}</span>,
	},
	{ label: "Publication", cell: (row) => <ProductStatus status={row.status} /> },
	{
		label: "Stock status",
		cell: (row) => (
			<StockStatus stock={row.availableStock} lowStockThreshold={row.lowStockThreshold} />
		),
	},
	{
		label: "Threshold",
		sort: "threshold.asc",
		className: "text-right tabular-nums",
		cell: (row) => formatCount(row.lowStockThreshold),
	},
	{
		label: "On hand",
		className: "text-right font-medium tabular-nums",
		cell: (row) => formatCount(row.stock),
	},
	{
		label: "Available",
		sort: "stock.desc",
		className: "text-right font-medium tabular-nums",
		cell: (row) => formatCount(row.availableStock),
	},
];

type InventoryListProps = ListPage<ProductListRow> & {
	search: InventorySearch;
	onSearch: (search: InventorySearch) => void;
};

const InventoryFilters = ({
	search,
	onSearch,
}: Pick<InventoryListProps, "search" | "onSearch">) => (
	<ListControls
		search={search}
		placeholder="Search inventory"
		readSearch={(form) => inventorySearchSchema.parse(Object.fromEntries(form))}
		onSearch={onSearch}
		onClear={
			search.q || search.stock || search.status
				? () => onSearch({ q: "", page: 1, sort: search.sort, perPage: search.perPage })
				: undefined
		}
	>
		<NativeSelect name="stock" aria-label="Stock filter" defaultValue={search.stock ?? ""}>
			<NativeSelectOption value="">All stock levels</NativeSelectOption>
			{stockFilters.map((stock) => (
				<NativeSelectOption key={stock} value={stock}>
					{stockFilterLabels[stock]}
				</NativeSelectOption>
			))}
		</NativeSelect>
		<NativeSelect name="status" aria-label="Publication" defaultValue={search.status ?? ""}>
			<NativeSelectOption value="">All publication states</NativeSelectOption>
			{productStatuses.map((status) => (
				<NativeSelectOption key={status} value={status}>
					{productStatusLabels[status]}
				</NativeSelectOption>
			))}
		</NativeSelect>
	</ListControls>
);

export const InventoryList = ({ rows, total, search, onSearch }: InventoryListProps) => (
	<div className="flex flex-col gap-4">
		<InventoryFilters search={search} onSearch={onSearch} />
		<ListPagination total={total} search={search} onSearch={onSearch} />
		<DataTable
			sorting={listSorting(search, "name.asc", inventorySearchSchema, onSearch)}
			rows={rows}
			columns={inventoryColumns}
			label="Inventory"
			empty={
				search.q || search.stock || search.status ? "No matching inventory" : "No inventory yet"
			}
			emptyAction={
				search.q || search.stock || search.status ? (
					<ClearFilters
						onClear={() => onSearch({ q: "", page: 1, sort: search.sort, perPage: search.perPage })}
					/>
				) : (
					<Link to="/products" className={buttonVariants({ variant: "outline" })}>
						View products
					</Link>
				)
			}
			emptyDescription="Check your filters or add products to your catalog."
		/>
		<ListPagination total={total} search={search} onSearch={onSearch} bottom />
	</div>
);
