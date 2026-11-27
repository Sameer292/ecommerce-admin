import { listSorting } from "@/components/admin/table-sorting";
import { RecordLink } from "@/components/admin/record-link";
import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";
import { ClearFilters, DataTable } from "@/components/admin/data-table";
import { ListControls } from "@/components/admin/list-controls";
import type { Column, ListPage } from "@/components/admin/list.types";
import { ListPagination } from "@/components/admin/page-controls";
import { FilterSelect } from "@/components/admin/form-fields";
import {
	productStatusOptions,
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
		className: "text-center",
		cell: (row) => <StockStatus stock={row.availableStock} />,
	},
	{
		label: "On hand",
		className: "text-center font-medium tabular-nums",
		cell: (row) => formatCount(row.stock),
	},
	{
		label: "Available",
		sort: "stock.desc",
		className: "text-center font-medium tabular-nums",
		cell: (row) => formatCount(row.availableStock),
	},
];

type InventoryListProps = ListPage<ProductListRow> & {
	search: InventorySearch;
	onSearch: (search: InventorySearch) => void;
};

const stockOptions = [
	{ value: "", label: "All stock levels" },
	...stockFilters.map((value) => ({ value, label: stockFilterLabels[value] })),
];

const publicationOptions = [
	{ value: "", label: "All publication states" },
	...productStatusOptions,
];

const InventoryFilters = ({
	search,
	onSearch,
}: Pick<InventoryListProps, "search" | "onSearch">) => (
	<ListControls
		search={search}
		placeholder="Search inventory"
		searchClassName="max-md:basis-full md:max-w-xs"
		readSearch={(form) => inventorySearchSchema.parse(Object.fromEntries(form))}
		onSearch={onSearch}
		onClear={
			search.q || search.stock || search.status
				? () => onSearch({ q: "", page: 1, sort: search.sort, perPage: search.perPage })
				: undefined
		}
	>
		<div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto">
			<FilterSelect
				name="stock"
				label="Stock filter"
				value={search.stock}
				items={stockOptions}
				className="min-w-0 max-md:w-full"
			/>
			<FilterSelect
				name="status"
				label="Publication"
				value={search.status}
				items={publicationOptions}
				className="min-w-0 max-md:w-full"
			/>
		</div>
	</ListControls>
);

export const InventoryList = ({ rows, total, search, onSearch }: InventoryListProps) => (
	<div className="flex flex-col gap-4">
		<InventoryFilters search={search} onSearch={onSearch} />
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
		<ListPagination total={total} search={search} onSearch={onSearch} />
	</div>
);
