import { useQueryClient } from "@tanstack/react-query";
import { useHydrated } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldError, FieldSet } from "@/components/ui/field";
import { useToastManager } from "@/components/ui/toast";
import type { MutationFailure, MutationResult } from "@/server/mutation.types";
import { FieldValidation, ReadOnlyFields } from "./form-fields";
import { useUnsavedChanges } from "./unsaved-changes";

type FormProps = {
	children: ReactNode;
	onSave?: (form: FormData) => Promise<MutationResult>;
	onSuccess?: () => unknown;
	submitLabel?: string;
	successMessage?: string;
	destructive?: boolean;
};

const useSubmitForm = ({
	onSave,
	onSuccess,
	successMessage,
}: Pick<FormProps, "onSave" | "onSuccess" | "successMessage">) => {
	const queryClient = useQueryClient();
	const { add } = useToastManager();
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
				if (successMessage) add({ title: successMessage });
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
	successMessage,
	destructive,
}: FormProps) => {
	const { failure, pending, submit } = useSubmitForm({ onSave, onSuccess, successMessage });
	const hydrated = useHydrated();
	const { register } = useUnsavedChanges();
	if (!onSave) {
		return (
			<section aria-label="Read-only access" className="flex flex-col items-start gap-4">
				<Badge variant="secondary">Read-only access</Badge>
				<div className="flex w-full min-w-0 flex-col gap-4">
					<ReadOnlyFields value={true}>{children}</ReadOnlyFields>
				</div>
			</section>
		);
	}
	return (
		<form ref={register} method="post" onSubmit={submit} className="flex flex-col gap-4">
			<FieldSet disabled={!hydrated || pending} className="min-w-0">
				<FieldValidation value={failure?.fieldErrors}>{children}</FieldValidation>
			</FieldSet>
			{failure && <FieldError>{failure.error}</FieldError>}
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
		</form>
	);
};
