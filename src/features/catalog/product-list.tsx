import { ListControls } from "@/components/admin/list-controls";
import type { ListPage } from "@/components/admin/list.types";
import { PageControls } from "@/components/admin/page-controls";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { productStatuses, productStatusLabels } from "./catalog-options";
import { productSearchSchema } from "./catalog-validation";
import type { Category, ProductListRow, ProductSearch } from "./catalog.types";
import { ProductTable } from "./product-table";

type ProductListProps = ListPage<ProductListRow> & {
	search: ProductSearch;
	currency: string;
	category?: Category;
	onSearch: (search: ProductSearch) => void;
};

const ProductStatusFilter = ({ status }: Pick<ProductSearch, "status">) => (
	<NativeSelect
		name="status"
		aria-label="Product status"
		defaultValue={status ?? ""}
		className="h-9"
	>
		<NativeSelectOption value="">All statuses</NativeSelectOption>
		{productStatuses.map((status) => (
			<NativeSelectOption key={status} value={status}>
				{productStatusLabels[status]}
			</NativeSelectOption>
		))}
	</NativeSelect>
);

type ProductFilterProps = Pick<ProductListProps, "search" | "category" | "onSearch">;

const ProductFilters = ({ search, category, onSearch }: ProductFilterProps) => (
	<ListControls
		key={`${search.q}:${search.status}`}
		query={search.q}
		placeholder="Search products"
		onSearch={(form) =>
			onSearch(
				productSearchSchema.parse({ ...Object.fromEntries(form), category: search.category }),
			)
		}
		onClear={
			search.q || search.status || search.category ? () => onSearch({ q: "", page: 1 }) : undefined
		}
	>
		<ProductStatusFilter status={search.status} />
		{category && <span className="text-sm text-muted-foreground">Category: {category.name}</span>}
	</ListControls>
);

export const ProductList = ({
	search,
	category,
	onSearch,
	rows,
	total,
	currency,
}: ProductListProps) => (
	<div className="flex flex-col gap-4">
		<ProductFilters search={search} category={category} onSearch={onSearch} />
		<ProductTable
			rows={rows}
			currency={currency}
			filtered={Boolean(search.q || search.status || search.category || search.page > 1)}
		/>
		<PageControls
			page={search.page}
			total={total}
			onPage={(page) => onSearch({ ...search, page })}
		/>
	</div>
);
