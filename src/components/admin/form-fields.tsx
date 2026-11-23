import { useId, type ComponentProps } from "react";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type FieldInfo = { label: string; hint?: string };

export const TextField = ({ label, hint, ...props }: FieldInfo & ComponentProps<typeof Input>) => {
	const id = useId();
	return (
		<Field>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Input
				{...props}
				id={id}
				className="h-9"
				aria-describedby={hint ? `${id}-hint` : undefined}
			/>
			{hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
		</Field>
	);
};

export const SelectField = ({
	label,
	hint,
	children,
	...props
}: FieldInfo & ComponentProps<typeof NativeSelect>) => {
	const id = useId();
	return (
		<Field>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<NativeSelect
				{...props}
				id={id}
				className="h-9 w-full"
				aria-describedby={hint ? `${id}-hint` : undefined}
			>
				{children}
			</NativeSelect>
			{hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
		</Field>
	);
};

export const NotesField = ({
	label,
	...props
}: Pick<FieldInfo, "label"> & ComponentProps<typeof Textarea>) => {
	const id = useId();
	return (
		<Field>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Textarea {...props} id={id} />
		</Field>
	);
};
