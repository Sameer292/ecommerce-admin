import { Link } from "@tanstack/react-router";
import { DataTable } from "@/components/admin/data-table";
import { ListControls } from "@/components/admin/list-controls";
import type { Column, ListPage } from "@/components/admin/list.types";
import { PageControls } from "@/components/admin/page-controls";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { stockFilterLabels, stockFilters } from "@/features/catalog/catalog-options";
import type { ProductListRow } from "@/features/catalog/catalog.types";
import { StockStatus } from "@/features/catalog/product-labels";
import { formatCount } from "@/lib/format";
import { inventorySearchSchema } from "./inventory-validation";
import type { InventorySearch } from "./inventory.types";

const inventoryColumns: Column<ProductListRow>[] = [
	{
		label: "Product",
		cell: (row) => (
			<Link
				to="/inventory/$productId"
				params={{ productId: row.id }}
				className="font-medium hover:underline"
			>
				{row.name}
			</Link>
		),
	},
	{
		label: "SKU",
		cell: (row) => <span className="text-muted-foreground">{row.sku}</span>,
	},
	{ label: "Status", compact: true, cell: (row) => <StockStatus {...row} /> },
	{
		label: "Threshold",
		compact: true,
		className: "tabular-nums",
		cell: (row) => formatCount(row.lowStockThreshold),
	},
	{
		label: "On hand",
		compact: true,
		className: "tabular-nums font-medium",
		cell: (row) => formatCount(row.stock),
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
		onClear={search.q || search.stock ? () => onSearch({ q: "", page: 1 }) : undefined}
	>
		<NativeSelect
			name="stock"
			aria-label="Stock filter"
			defaultValue={search.stock ?? ""}
			className="h-9"
		>
			<NativeSelectOption value="">All products</NativeSelectOption>
			{stockFilters.map((stock) => (
				<NativeSelectOption key={stock} value={stock}>
					{stockFilterLabels[stock]}
				</NativeSelectOption>
			))}
		</NativeSelect>
	</ListControls>
);

export const InventoryList = ({ rows, total, search, onSearch }: InventoryListProps) => (
	<div className="flex flex-col gap-4">
		<InventoryFilters search={search} onSearch={onSearch} />
		<DataTable
			rows={rows}
			columns={inventoryColumns}
			label="Inventory"
			empty="No matching inventory"
			emptyDescription="Check your filters or add products to your catalog."
		/>
		<PageControls
			total={total}
			page={search.page}
			onPage={(page) => onSearch({ ...search, page })}
		/>
	</div>
);
