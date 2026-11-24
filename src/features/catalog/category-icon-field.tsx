import { useId, useState } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { categoryIcons, defaultCategoryIcon } from "./catalog-options";
import type { Category } from "./catalog.types";
import { CategoryIcon, categoryIconOptions } from "./category-icon";

export const CategoryIconField = ({
	icon = defaultCategoryIcon,
}: Partial<Pick<Category, "icon">>) => {
	const id = useId();
	const [selected, setSelected] = useState(icon);
	return (
		<Field>
			<FieldLabel htmlFor={id}>Icon</FieldLabel>
			<div className="flex items-center gap-2">
				<CategoryIcon icon={selected} />
				<NativeSelect
					id={id}
					name="icon"
					value={selected}
					onChange={({ target }) =>
						setSelected(categoryIcons.find((icon) => icon === target.value) ?? defaultCategoryIcon)
					}
					className="w-full"
				>
					{categoryIcons.map((icon) => (
						<NativeSelectOption key={icon} value={icon}>
							{categoryIconOptions[icon].label}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</div>
		</Field>
	);
};
