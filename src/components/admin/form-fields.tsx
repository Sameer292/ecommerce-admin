import {
	createContext,
	useContext,
	useId,
	useRef,
	type ComponentProps,
	type ReactNode,
} from "react";
import { Field, FieldDescription, FieldError, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FieldErrors } from "@/server/mutation.types";

export const FieldValidation = createContext<FieldErrors | undefined>(undefined);
export const ReadOnlyFields = createContext(false);

type FieldInfo = { label: string; hint?: string };
type ControlProps = { id: string; "aria-invalid"?: true; "aria-describedby"?: string };

export const FormField = ({
	label,
	hint,
	name,
	required,
	render,
	readOnlyValue,
}: FieldInfo & {
	name?: string;
	required?: boolean;
	render: (props: ControlProps) => ReactNode;
	readOnlyValue?: ReactNode;
}) => {
	const id = useId();
	const errors = useContext(FieldValidation);
	const readOnly = useContext(ReadOnlyFields);
	if (readOnly) {
		return (
			<Field>
				<FieldTitle>{label}</FieldTitle>
				<p className="text-sm wrap-break-word whitespace-pre-wrap">
					{readOnlyValue === "" || readOnlyValue == null ? "—" : readOnlyValue}
				</p>
			</Field>
		);
	}
	const error = name && errors && Object.hasOwn(errors, name) ? errors[name] : undefined;
	const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");
	return (
		<Field data-invalid={error ? true : undefined}>
			<FieldLabel htmlFor={id}>
				{label}
				{required && (
					<span aria-hidden className="text-xs text-muted-foreground">
						Required
					</span>
				)}
			</FieldLabel>
			{render({
				id,
				"aria-invalid": error ? true : undefined,
				"aria-describedby": describedBy || undefined,
			})}
			{hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
			{error && <FieldError id={`${id}-error`}>{error}</FieldError>}
		</Field>
	);
};

export const TextField = ({ label, hint, ...props }: FieldInfo & ComponentProps<typeof Input>) => (
	<FormField
		label={label}
		hint={hint}
		name={props.name}
		required={props.required}
		readOnlyValue={props.value ?? props.defaultValue}
		render={(field) => <Input {...props} {...field} />}
	/>
);

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

export const NotesField = ({
	label,
	...props
}: Pick<FieldInfo, "label"> & ComponentProps<typeof Textarea>) => (
	<FormField
		label={label}
		name={props.name}
		required={props.required}
		readOnlyValue={props.value ?? props.defaultValue}
		render={(field) => <Textarea {...props} {...field} />}
	/>
);
