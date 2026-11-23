import { ListControls } from "@/components/admin/list-controls";
import { FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { currencyDigits, moneyInput } from "@/lib/format";
import { productStatuses, productStatusLabels } from "./catalog-options";
import { readProductFilters } from "./catalog-validation";
import type { CategoryOption, ProductSearch } from "./catalog.types";

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
	<NativeSelect
		name="status"
		aria-label="Product status"
		defaultValue={status ?? ""}
		className="[&>select]:h-9"
	>
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
		className="max-w-48 [&>select]:h-9"
	>
		<NativeSelectOption value="">All categories</NativeSelectOption>
		{categories.map(({ id, name }) => (
			<NativeSelectOption key={id} value={id}>
				{name}
			</NativeSelectOption>
		))}
	</NativeSelect>
);

const PriceBound = ({
	name,
	label,
	value,
	currency,
}: {
	name: string;
	label: string;
	value?: number;
	currency: string;
}) => {
	const digits = currencyDigits(currency);
	const fraction = digits ? `(?:\\.[0-9]{1,${digits}})?` : "";
	return (
		<Input
			name={name}
			inputMode="decimal"
			pattern={`[0-9]{1,12}${fraction}`}
			maxLength={16}
			aria-label={`${label} (${currency})`}
			placeholder={label}
			defaultValue={value === undefined ? "" : moneyInput(value, currency)}
			className="h-9 min-w-0 flex-1 invalid:border-destructive"
		/>
	);
};

const PriceRangeFilter = ({
	search,
	currency,
}: Pick<ProductFilterProps, "search" | "currency">) => (
	<FieldSet className="w-full min-w-0 flex-row gap-2 sm:w-48">
		<FieldLegend className="sr-only">Price range ({currency})</FieldLegend>
		<PriceBound
			name="minPrice"
			label="Min price"
			currency={currency}
			value={search.minPriceMinor}
		/>
		<PriceBound
			name="maxPrice"
			label="Max price"
			currency={currency}
			value={search.maxPriceMinor}
		/>
	</FieldSet>
);

export const ProductFilters = ({ search, categories, currency, onSearch }: ProductFilterProps) => (
	<ListControls
		search={search}
		placeholder="Search products"
		readSearch={(form) => readProductFilters(form, currency)}
		onSearch={onSearch}
		onClear={hasProductFilters(search) ? () => onSearch({ q: "", page: 1 }) : undefined}
	>
		<ProductStatusFilter status={search.status} />
		<CategoryFilter category={search.category} categories={categories} />
		<PriceRangeFilter search={search} currency={currency} />
	</ListControls>
);
