import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState, type ComponentProps } from "react";
import { FormField } from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { defaultCategoryIcon } from "./catalog-options";
import type { Category } from "./catalog.types";
import { categoryIconOptions } from "./category-icon";
import { CategoryIconPicker } from "./category-icon-picker";

const IconTrigger = ({
	icon,
	...props
}: Pick<Category, "icon"> & ComponentProps<typeof PopoverTrigger>) => (
	<PopoverTrigger
		{...props}
		aria-label={`Icon, ${categoryIconOptions[icon].label}`}
		render={<Button type="button" variant="outline" size="lg" className="w-full justify-start" />}
	>
		<HugeiconsIcon
			icon={categoryIconOptions[icon].glyph}
			data-icon="inline-start"
			className="size-6"
			aria-hidden
		/>
		{categoryIconOptions[icon].label}
		<HugeiconsIcon icon={ArrowDown01Icon} data-icon="inline-end" className="ml-auto" aria-hidden />
	</PopoverTrigger>
);

export const CategoryIconField = ({
	icon = defaultCategoryIcon,
}: Partial<Pick<Category, "icon">>) => {
	const [selected, setSelected] = useState(icon);
	return (
		<FormField
			label="Icon"
			name="icon"
			render={(field) => (
				<>
					<input type="hidden" name="icon" value={selected} />
					<Popover modal="trap-focus">
						<IconTrigger {...field} icon={selected} />
						<CategoryIconPicker selected={selected} onSelect={setSelected} />
					</Popover>
				</>
			)}
		/>
	);
};
