import { createContext, useContext, useId, type ComponentProps, type ReactNode } from "react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { FieldErrors } from "@/server/mutation.types";
import { cn } from "@/lib/utils";

export const FieldValidation = createContext<FieldErrors | undefined>(undefined);

type FieldInfo = { label: string; hint?: string };
type ControlProps = { id: string; "aria-invalid"?: true; "aria-describedby"?: string };

export const FormField = ({
	label,
	hint,
	name,
	render,
}: FieldInfo & { name?: string; render: (props: ControlProps) => ReactNode }) => {
	const id = useId();
	const errors = useContext(FieldValidation);
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

export const TextField = ({
	label,
	hint,
	className,
	...props
}: FieldInfo & ComponentProps<typeof Input>) => (
	<FormField
		label={label}
		hint={hint}
		name={props.name}
		render={(field) => <Input {...props} {...field} className={cn("h-9", className)} />}
	/>
);

export const SelectField = ({
	label,
	hint,
	...props
}: FieldInfo & ComponentProps<typeof NativeSelect>) => (
	<FormField
		label={label}
		hint={hint}
		name={props.name}
		render={(field) => <NativeSelect {...props} {...field} className="h-9 w-full" />}
	/>
);

export const NotesField = ({
	label,
	...props
}: Pick<FieldInfo, "label"> & ComponentProps<typeof Textarea>) => (
	<FormField
		label={label}
		name={props.name}
		render={(field) => <Textarea {...props} {...field} />}
	/>
);
