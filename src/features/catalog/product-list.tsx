import type { ListPage } from "@/components/admin/list.types";
import { PageControls } from "@/components/admin/page-controls";
import type { CategoryOption, ProductListRow, ProductSearch } from "./catalog.types";
import { hasProductFilters, ProductFilters } from "./product-filters";
import { ProductTable } from "./product-table";

type ProductListProps = ListPage<ProductListRow> & {
	search: ProductSearch;
	currency: string;
	priceCeiling: number;
	categories: CategoryOption[];
	onSearch: (search: ProductSearch) => void;
};

export const ProductList = ({
	search,
	categories,
	onSearch,
	rows,
	total,
	currency,
	priceCeiling,
}: ProductListProps) => (
	<div className="flex flex-col gap-4">
		<ProductFilters
			search={search}
			categories={categories}
			currency={currency}
			priceCeiling={priceCeiling}
			onSearch={onSearch}
		/>
		<ProductTable
			rows={rows}
			currency={currency}
			filtered={hasProductFilters(search) || search.page > 1}
		/>
		<PageControls
			page={search.page}
			total={total}
			onPage={(page) => onSearch({ ...search, page })}
		/>
	</div>
);
