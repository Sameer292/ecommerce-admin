import { useQueryClient } from "@tanstack/react-query";
import { useHydrated } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, FieldSet } from "@/components/ui/field";
import type { MutationFailure, MutationResult } from "@/server/mutation.types";
import { FieldValidation } from "./form-fields";
import { useUnsavedChanges } from "./unsaved-changes";

type FormProps = {
	children: ReactNode;
	onSave?: (form: FormData) => Promise<MutationResult>;
	onSuccess?: () => unknown;
	submitLabel?: string;
	destructive?: boolean;
};

const useSubmitForm = ({ onSave, onSuccess }: Pick<FormProps, "onSave" | "onSuccess">) => {
	const queryClient = useQueryClient();
	const { markSaved } = useUnsavedChanges();
	const [failure, setFailure] = useState<MutationFailure>();
	const [pending, setPending] = useState(false);
	const submittedForm = useRef<HTMLFormElement>(null);
	useEffect(() => {
		if (failure?.fieldErrors && !pending) {
			submittedForm.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
		}
	}, [failure, pending]);
	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!onSave || pending) return;
		const form = event.currentTarget;
		submittedForm.current = form;
		setFailure(undefined);
		setPending(true);
		try {
			const result = await onSave(new FormData(form));
			if (result.success) {
				markSaved(form);
				await queryClient.cancelQueries();
				await queryClient.invalidateQueries({ refetchType: "none" });
				await onSuccess?.();
				// Revalidation can replace fields with the server's saved values.
				markSaved(form);
			} else setFailure(result);
		} catch {
			setFailure({ success: false, error: "Couldn’t complete the request. Please try again." });
		} finally {
			setPending(false);
		}
	};
	return { failure, pending, submit };
};

export const AdminForm = ({
	children,
	onSave,
	onSuccess,
	submitLabel = "Save changes",
	destructive,
}: FormProps) => {
	const { failure, pending, submit } = useSubmitForm({ onSave, onSuccess });
	const hydrated = useHydrated();
	const { register } = useUnsavedChanges();
	return (
		<form
			ref={onSave ? register : undefined}
			method="post"
			onSubmit={submit}
			className="flex flex-col gap-4"
		>
			<FieldSet disabled={!onSave || !hydrated || pending} className="min-w-0">
				<FieldValidation value={failure?.fieldErrors}>{children}</FieldValidation>
			</FieldSet>
			{failure && <FieldError>{failure.error}</FieldError>}
			{onSave && (
				<div className="flex justify-end">
					<Button
						type="submit"
						size="lg"
						variant={destructive ? "destructive" : "default"}
						disabled={!hydrated || pending}
					>
						{pending ? "Saving…" : submitLabel}
					</Button>
				</div>
			)}
		</form>
	);
};
