import { useBlocker } from "@tanstack/react-router";
import { createContext, useContext, useState, type ReactNode } from "react";

// FormData omits disabled fields, including edits while a save is pending.
const formValues = (form: HTMLFormElement) =>
	JSON.stringify(
		Array.from(
			form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
				"input[name], select[name], textarea[name]",
			),
			(field) => [field.name, field.value, "checked" in field ? field.checked : null],
		),
	);

const createFormGuard = () => {
	const forms = new Map<HTMLFormElement, string>();
	const isDirty = () => [...forms].some(([form, saved]) => formValues(form) !== saved);
	const markSaved = (form: HTMLFormElement) => {
		if (forms.has(form)) forms.set(form, formValues(form));
	};
	return {
		isDirty,
		markSaved,
		register: (form: HTMLFormElement | null) => {
			if (!form) return;
			forms.set(form, formValues(form));
			return () => {
				forms.delete(form);
			};
		},
		confirmDiscard: () =>
			!isDirty() || window.confirm("You have unsaved changes. Leave and discard them?"),
		discardChanges: () => {
			for (const form of forms.keys()) markSaved(form);
		},
	};
};

const FormGuardContext = createContext<ReturnType<typeof createFormGuard> | null>(null);

export const UnsavedChangesProvider = ({ children }: { children: ReactNode }) => {
	const [guard] = useState(createFormGuard);
	useBlocker({
		shouldBlockFn: () => !guard.confirmDiscard(),
		enableBeforeUnload: guard.isDirty,
	});
	return <FormGuardContext value={guard}>{children}</FormGuardContext>;
};

export const useUnsavedChanges = () => {
	const guard = useContext(FormGuardContext);
	if (!guard) throw new Error("Forms must be inside UnsavedChangesProvider.");
	return guard;
};
