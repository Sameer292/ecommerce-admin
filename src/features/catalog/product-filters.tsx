import { ListControls } from "@/components/admin/list-controls";
import { FilterSelect } from "@/components/admin/select-field";
import { FieldGroup } from "@/components/ui/field";
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
			searchClassName="max-md:basis-full md:max-w-xs"
			readSearch={(form) => readProductFilters(form, currency)}
			onSearch={onSearch}
			onClear={
				hasProductFilters(search)
					? () => onSearch({ q: "", page: 1, sort: search.sort, perPage: search.perPage })
					: undefined
			}
		>
			<FieldGroup className="grid grid-cols-2 gap-2 md:flex md:w-auto md:flex-row">
				<FilterSelect
					name="status"
					label="Product status"
					value={search.status}
					items={statusOptions}
					className="min-w-0 max-md:w-full"
				/>
				<FilterSelect
					name="category"
					label="Product category"
					value={search.category}
					className="min-w-0 max-md:w-full md:max-w-48"
					items={[
						{ value: "", label: "All categories" },
						...categories.map(({ id, name }) => ({ value: id, label: name })),
					]}
				/>
			</FieldGroup>
			<PriceRangeFilter search={search} currency={currency} />
		</ListControls>
	);
};
