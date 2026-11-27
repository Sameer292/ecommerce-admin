import { ListControls } from "@/components/admin/list-controls";
import { FilterSelect } from "@/components/admin/form-fields";
import { productStatusOptions } from "./catalog-options";
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

const statusOptions = [{ value: "", label: "All statuses" }, ...productStatusOptions];

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
			<FilterSelect
				name="status"
				label="Product status"
				value={search.status}
				items={statusOptions}
			/>
			<FilterSelect
				name="category"
				label="Product category"
				value={search.category}
				className="max-w-48"
				items={[
					{ value: "", label: "All categories" },
					...categories.map(({ id, name }) => ({ value: id, label: name })),
				]}
			/>
			<PriceRangeFilter search={search} currency={currency} />
		</ListControls>
	);
};
