import { useRef, useState } from "react";
import { FieldLegend, FieldSet } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import { currencyDigits, formatMoney } from "@/lib/format";
import type { ProductSearch } from "./catalog.types";

type PriceRangeProps = {
	search: Pick<ProductSearch, "minPriceMinor" | "maxPriceMinor">;
	currency: string;
	ceiling: number;
};

const PriceLabels = ({ range, currency }: { range: number[]; currency: string }) => (
	<div className="flex flex-wrap items-center justify-between gap-x-2 text-xs">
		<span className="font-medium">Price</span>
		<span className="text-muted-foreground tabular-nums">
			{formatMoney(range[0], currency)} – {formatMoney(range[1], currency)}
		</span>
	</div>
);

export const PriceRangeFilter = ({ search, currency, ceiling }: PriceRangeProps) => {
	const field = useRef<HTMLFieldSetElement>(null);
	const [range, setRange] = useState([search.minPriceMinor ?? 0, search.maxPriceMinor ?? ceiling]);
	const update = (values: number[]) => {
		setRange(values);
		field.current?.form?.requestSubmit();
	};
	return (
		<FieldSet ref={field} className="w-full min-w-0 gap-2 sm:w-56">
			<FieldLegend className="sr-only">Price range</FieldLegend>
			<PriceLabels range={range} currency={currency} />
			<Slider
				name="priceRange"
				value={range}
				min={0}
				max={Math.max(1, ceiling)}
				step={1}
				largeStep={10 ** currencyDigits(currency)}
				disabled={ceiling === 0}
				thumbCollisionBehavior="none"
				onValueChange={update}
				getAriaLabel={(index) => (index === 0 ? "Minimum price" : "Maximum price")}
				getAriaValueText={(_, value) => formatMoney(value, currency)}
			/>
		</FieldSet>
	);
};
