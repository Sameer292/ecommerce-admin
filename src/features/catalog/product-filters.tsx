import { ListControls } from "@/components/admin/list-controls";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { productStatuses, productStatusLabels } from "./catalog-options";
import { readProductFilters } from "./catalog-validation";
import type { CategoryOption, ProductSearch } from "./catalog.types";
import { PriceRangeFilter } from "./price-range-filter";

type ProductFilterProps = {
	search: ProductSearch;
	categories: CategoryOption[];
	currency: string;
	onSearch: (search: ProductSearch) => void;
};

export const hasProductFilters = ({
	q,
	status,
	category,
	minPriceMinor,
	maxPriceMinor,
}: ProductSearch) =>
	Boolean(q || status || category || minPriceMinor !== undefined || maxPriceMinor !== undefined);

const ProductStatusFilter = ({ status }: Pick<ProductSearch, "status">) => (
	<NativeSelect name="status" aria-label="Product status" defaultValue={status ?? ""}>
		<NativeSelectOption value="">All statuses</NativeSelectOption>
		{productStatuses.map((status) => (
			<NativeSelectOption key={status} value={status}>
				{productStatusLabels[status]}
			</NativeSelectOption>
		))}
	</NativeSelect>
);

const CategoryFilter = ({
	category,
	categories,
}: {
	category: ProductSearch["category"];
	categories: CategoryOption[];
}) => (
	<NativeSelect
		name="category"
		aria-label="Product category"
		defaultValue={category ?? ""}
		className="max-w-48"
	>
		<NativeSelectOption value="">All categories</NativeSelectOption>
		{categories.map(({ id, name }) => (
			<NativeSelectOption key={id} value={id}>
				{name}
			</NativeSelectOption>
		))}
	</NativeSelect>
);

export const ProductFilters = ({ search, categories, currency, onSearch }: ProductFilterProps) => {
	return (
		<ListControls
			search={search}
			placeholder="Search products"
			readSearch={(form) => readProductFilters(form, currency)}
			onSearch={onSearch}
			onClear={
				hasProductFilters(search)
					? () => onSearch({ q: "", page: 1, sort: search.sort, perPage: search.perPage })
					: undefined
			}
		>
			<ProductStatusFilter status={search.status} />
			<CategoryFilter category={search.category} categories={categories} />
			<PriceRangeFilter search={search} currency={currency} />
		</ListControls>
	);
};
