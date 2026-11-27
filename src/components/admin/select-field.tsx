import { useRef, type ComponentProps } from "react";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { FormField, type FieldInfo } from "./form-fields";

type SelectControlProps = Pick<
	ComponentProps<typeof Select<string>>,
	"name" | "defaultValue" | "value" | "required" | "onValueChange" | "inputRef"
> & {
	items: readonly { value: string; label: string; disabled?: boolean }[];
	placeholder?: string;
	trigger: Pick<
		ComponentProps<typeof SelectTrigger>,
		"id" | "aria-label" | "aria-invalid" | "aria-describedby" | "className"
	>;
};

const SelectControl = ({ items, placeholder, trigger, ...props }: SelectControlProps) => (
	<Select {...props} items={items}>
		<SelectTrigger {...trigger}>
			<SelectValue placeholder={placeholder} className="min-w-0" />
		</SelectTrigger>
		<SelectContent
			align="start"
			alignItemWithTrigger={false}
			className="w-max max-w-(--available-width)"
		>
			<SelectGroup>
				{items.map(({ value, label, disabled }) => (
					<SelectItem key={value} value={value} disabled={disabled}>
						{label}
					</SelectItem>
				))}
			</SelectGroup>
		</SelectContent>
	</Select>
);

export const SelectField = ({
	label,
	hint,
	...props
}: FieldInfo & Omit<SelectControlProps, "trigger" | "inputRef">) => {
	const value = props.value ?? props.defaultValue;
	return (
		<FormField
			label={label}
			hint={hint}
			name={props.name}
			required={props.required}
			readOnlyValue={props.items.find((item) => item.value === value)?.label ?? value}
			render={(field) => <SelectControl {...props} trigger={{ ...field, className: "w-full" }} />}
		/>
	);
};

export const FilterSelect = ({
	name,
	label,
	value,
	items,
	className,
	id,
	submitOnChange = true,
}: {
	name: string;
	label: string;
	value?: string;
	items: SelectControlProps["items"];
	className?: string;
	id?: string;
	submitOnChange?: boolean;
}) => {
	const input = useRef<HTMLInputElement>(null);
	return (
		<SelectControl
			name={name}
			items={items}
			defaultValue={value ?? ""}
			inputRef={input}
			onValueChange={submitOnChange ? () => input.current?.form?.requestSubmit() : undefined}
			trigger={{ id, "aria-label": label, className }}
		/>
	);
};
