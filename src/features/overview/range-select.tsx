import { useHydrated } from "@tanstack/react-router";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { overviewSearchSchema } from "./overview-validation";
import type { OverviewRange } from "./overview.types";

export const RangeSelect = ({
	range,
	onChange,
}: {
	range: OverviewRange;
	onChange: (range: OverviewRange) => void;
}) => (
	<NativeSelect
		value={range}
		disabled={!useHydrated()}
		aria-label="Reporting period"
		className="min-w-32"
		onChange={(event) =>
			onChange(overviewSearchSchema.parse({ range: event.currentTarget.value }).range)
		}
	>
		<NativeSelectOption value={7}>Last 7 days</NativeSelectOption>
		<NativeSelectOption value={30}>Last 30 days</NativeSelectOption>
		<NativeSelectOption value={90}>Last 90 days</NativeSelectOption>
	</NativeSelect>
);
