import { NewRecord } from "@/components/admin/new-record";
import { useState } from "react";
import { ClearFilters } from "@/components/admin/data-table";
import { productSearchSchema } from "./catalog-validation";
import { listSorting } from "@/components/admin/table-sorting";
import type { ListPage } from "@/components/admin/list.types";
import { ListPagination } from "@/components/admin/page-controls";
import type { CategoryOption, ProductListRow, ProductSearch } from "./catalog.types";
import { hasProductFilters, ProductFilters } from "./product-filters";
import { ProductTable } from "./product-table";
import { ProductBatch } from "./product-batch";

type ProductListProps = ListPage<ProductListRow> & {
	search: ProductSearch;
	canCreate: boolean;
	currency: string;
	zone: string;
	categories: CategoryOption[];
	onSearch: (search: ProductSearch) => void;
};

export const ProductList = (props: ProductListProps) => {
	const { search, total, onSearch } = props;
	const [ids, setIds] = useState<string[]>([]);
	const selected = props.rows.filter((row) => ids.includes(row.id));
	const toggle = (id: string) =>
		setIds((current) =>
			current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
		);
	const applySearch = (next: ProductSearch) => {
		setIds([]);
		onSearch(next);
	};
	const filtered = hasProductFilters(search);
	return (
		<div className="flex flex-col gap-4">
			<ProductFilters {...props} onSearch={applySearch} />
			<ListPagination total={total} search={search} onSearch={applySearch} />
			{props.canCreate && selected.length > 0 && (
				<ProductBatch selected={selected} categories={props.categories} clear={() => setIds([])} />
			)}
			<ProductTable
				{...props}
				selection={props.canCreate ? { ids, toggle } : undefined}
				sorting={listSorting(search, "name.asc", productSearchSchema, applySearch)}
				filtered={filtered || search.page > 1}
				emptyAction={
					filtered ? (
						<ClearFilters
							onClear={() =>
								applySearch({ q: "", page: 1, sort: search.sort, perPage: search.perPage })
							}
						/>
					) : props.canCreate ? (
						<NewRecord to="/products/new" label="Add product" />
					) : undefined
				}
			/>
			<ListPagination total={total} search={search} onSearch={applySearch} bottom />
		</div>
	);
};
