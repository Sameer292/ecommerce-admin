import { useId, useState } from "react";
import { FieldError, FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { moneyInput } from "@/lib/format";
import { readPriceBounds } from "./catalog-validation";
import type { ProductSearch } from "./catalog.types";

type PriceRangeProps = {
	search: Pick<ProductSearch, "minPriceMinor" | "maxPriceMinor">;
	currency: string;
};

export const PriceRangeFilter = ({ search, currency }: PriceRangeProps) => {
	const errorId = useId();
	const [minimum, setMinimum] = useState(
		search.minPriceMinor === undefined ? "" : moneyInput(search.minPriceMinor, currency),
	);
	const [maximum, setMaximum] = useState(
		search.maxPriceMinor === undefined ? "" : moneyInput(search.maxPriceMinor, currency),
	);
	const invalid = readPriceBounds(minimum, maximum, currency) === null;
	return (
		<FieldSet className="min-w-0 gap-2 max-md:w-full">
			<FieldLegend className="sr-only">Price range ({currency})</FieldLegend>
			<FieldGroup className="grid grid-cols-2 gap-2 md:flex md:flex-row md:items-center">
				<span aria-hidden className="col-span-2 text-sm text-muted-foreground">
					Price ({currency})
				</span>
				<Input
					name="minPrice"
					aria-label={`Minimum price (${currency})`}
					placeholder="Min"
					inputMode="decimal"
					maxLength={24}
					aria-invalid={invalid || undefined}
					aria-describedby={invalid ? errorId : undefined}
					value={minimum}
					onChange={(event) => setMinimum(event.currentTarget.value)}
					className="tabular-nums md:w-24"
				/>
				<Input
					name="maxPrice"
					aria-label={`Maximum price (${currency})`}
					placeholder="Max"
					inputMode="decimal"
					maxLength={24}
					aria-invalid={invalid || undefined}
					aria-describedby={invalid ? errorId : undefined}
					value={maximum}
					onChange={(event) => setMaximum(event.currentTarget.value)}
					className="tabular-nums md:w-24"
				/>
			</FieldGroup>
			{invalid && (
				<FieldError id={errorId}>
					Enter valid prices with the minimum at or below the maximum.
				</FieldError>
			)}
		</FieldSet>
	);
};
