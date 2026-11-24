import { productSearchSchema } from "./catalog-validation";
import { listSorting } from "@/components/admin/table-sorting";
import type { ListPage } from "@/components/admin/list.types";
import { PageControls } from "@/components/admin/page-controls";
import type { CategoryOption, ProductListRow, ProductSearch } from "./catalog.types";
import { hasProductFilters, ProductFilters } from "./product-filters";
import { ProductTable } from "./product-table";

type ProductListProps = ListPage<ProductListRow> & {
	search: ProductSearch;
	currency: string;
	zone: string;
	priceCeiling: number;
	categories: CategoryOption[];
	onSearch: (search: ProductSearch) => void;
};

export const ProductList = (props: ProductListProps) => {
	const { search, total, onSearch } = props;
	return (
		<div className="flex flex-col gap-4">
			<ProductFilters {...props} />
			<ProductTable
				{...props}
				sorting={listSorting(search, "name.asc", productSearchSchema, onSearch)}
				filtered={hasProductFilters(search) || search.page > 1}
			/>
			<PageControls
				page={search.page}
				total={total}
				onPage={(page) => onSearch({ ...search, page })}
			/>
		</div>
	);
};
