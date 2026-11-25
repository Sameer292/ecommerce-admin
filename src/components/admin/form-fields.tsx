import {
	Children,
	createContext,
	isValidElement,
	useContext,
	useId,
	type ComponentProps,
	type ReactNode,
} from "react";
import { Field, FieldDescription, FieldError, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
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
	render,
	readOnlyValue,
}: FieldInfo & {
	name?: string;
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
				<p className="text-sm break-words whitespace-pre-wrap">
					{readOnlyValue === "" || readOnlyValue == null ? "—" : readOnlyValue}
				</p>
			</Field>
		);
	}
	const error = name && errors && Object.hasOwn(errors, name) ? errors[name] : undefined;
	const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");
	return (
		<Field data-invalid={error ? true : undefined}>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
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
		readOnlyValue={props.value ?? props.defaultValue}
		render={(field) => <Input {...props} {...field} />}
	/>
);

export const SelectField = ({
	label,
	hint,
	children,
	...props
}: FieldInfo & ComponentProps<typeof NativeSelect>) => {
	const value = props.value ?? props.defaultValue;
	const selected = Children.toArray(children).find(
		(child) =>
			isValidElement<{ value?: string | number; children?: ReactNode }>(child) &&
			String(child.props.value) === String(value),
	);
	const display = isValidElement<{ children?: ReactNode }>(selected)
		? selected.props.children
		: value;
	return (
		<FormField
			label={label}
			hint={hint}
			name={props.name}
			readOnlyValue={display}
			render={(field) => (
				<NativeSelect {...props} {...field} className="w-full">
					{children}
				</NativeSelect>
			)}
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
		readOnlyValue={props.value ?? props.defaultValue}
		render={(field) => <Textarea {...props} {...field} />}
	/>
);
