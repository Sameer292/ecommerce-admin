import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { defaultCategoryIcon } from "./catalog-options";
import type { Category } from "./catalog.types";
import { categoryIconOptions } from "./category-icon";
import { CategoryIconPicker } from "./category-icon-picker";

const IconTrigger = ({ id, icon }: Pick<Category, "icon"> & { id: string }) => (
	<PopoverTrigger
		id={id}
		aria-label={`Icon, ${categoryIconOptions[icon].label}`}
		render={<Button type="button" variant="outline" size="lg" className="w-full justify-start" />}
	>
		<HugeiconsIcon icon={categoryIconOptions[icon].glyph} data-icon="inline-start" aria-hidden />
		{categoryIconOptions[icon].label}
		<HugeiconsIcon icon={ArrowDown01Icon} data-icon="inline-end" className="ml-auto" aria-hidden />
	</PopoverTrigger>
);

export const CategoryIconField = ({
	icon = defaultCategoryIcon,
}: Partial<Pick<Category, "icon">>) => {
	const id = useId();
	const [selected, setSelected] = useState(icon);
	return (
		<Field>
			<FieldLabel htmlFor={id}>Icon</FieldLabel>
			<input type="hidden" name="icon" value={selected} />
			<Popover modal="trap-focus">
				<IconTrigger id={id} icon={selected} />
				<CategoryIconPicker selected={selected} onSelect={setSelected} />
			</Popover>
		</Field>
	);
};
