import { NewRecord } from "@/components/admin/new-record";
import { ClearFilters } from "@/components/admin/data-table";
import { productSearchSchema } from "./catalog-validation";
import { listSorting } from "@/components/admin/table-sorting";
import type { ListPage } from "@/components/admin/list.types";
import { ListPagination } from "@/components/admin/page-controls";
import type { CategoryOption, ProductListRow, ProductSearch } from "./catalog.types";
import { hasProductFilters, ProductFilters } from "./product-filters";
import { ProductTable } from "./product-table";

type ProductListProps = ListPage<ProductListRow> & {
	search: ProductSearch;
	canCreate: boolean;
	currency: string;
	zone: string;
	priceCeiling: number;
	categories: CategoryOption[];
	onSearch: (search: ProductSearch) => void;
};

export const ProductList = (props: ProductListProps) => {
	const { search, total, onSearch } = props;
	const filtered = hasProductFilters(search);
	return (
		<div className="flex flex-col gap-4">
			<ProductFilters {...props} />
			<ListPagination total={total} search={search} onSearch={onSearch} />
			<ProductTable
				{...props}
				sorting={listSorting(search, "name.asc", productSearchSchema, onSearch)}
				filtered={filtered || search.page > 1}
				emptyAction={
					filtered ? (
						<ClearFilters
							onClear={() =>
								onSearch({ q: "", page: 1, sort: search.sort, perPage: search.perPage })
							}
						/>
					) : props.canCreate ? (
						<NewRecord to="/products/new" label="Add product" />
					) : undefined
				}
			/>
			<ListPagination total={total} search={search} onSearch={onSearch} bottom />
		</div>
	);
};
