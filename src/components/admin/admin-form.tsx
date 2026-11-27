import { useQueryClient } from "@tanstack/react-query";
import { Link, useHydrated, useLocation } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode, type SubmitEvent } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldError, FieldSet } from "@/components/ui/field";
import { useToastManager } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { loginReturn } from "@/features/auth/login-return";
import type { MutationFailure, MutationResult } from "@/server/mutation.types";
import { FieldValidation, ReadOnlyFields } from "./form-fields";
import { useUnsavedChanges } from "./unsaved-changes";

type FormProps = {
	children: ReactNode;
	onSave?: (form: FormData) => Promise<MutationResult>;
	onSuccess?: () => unknown;
	submitLabel?: string;
	successMessage?: string;
	cancelHref?: string;
	cancelAction?: ReactNode;
	stickyActions?: boolean;
	requireChanges?: boolean;
	destructive?: boolean;
};

const useSubmitForm = ({
	onSave,
	onSuccess,
	successMessage,
	requireChanges,
	onSaved,
}: Pick<FormProps, "onSave" | "onSuccess" | "successMessage" | "requireChanges"> & {
	onSaved: () => void;
}) => {
	const queryClient = useQueryClient();
	const { add } = useToastManager();
	const { isFormDirty, markSaved } = useUnsavedChanges();
	const [failure, setFailure] = useState<MutationFailure>();
	const [pending, setPending] = useState(false);
	const submittedForm = useRef<HTMLFormElement>(null);
	useEffect(() => {
		if (failure?.fieldErrors && !pending) {
			const field = submittedForm.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
			const details = field?.closest("details");
			if (details) details.open = true;
			field?.focus();
		}
	}, [failure, pending]);
	const submit = async (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!onSave || pending) return;
		const form = event.currentTarget;
		if (requireChanges && !isFormDirty(form)) return;
		submittedForm.current = form;
		setFailure(undefined);
		setPending(true);
		try {
			const result = await onSave(new FormData(form));
			if (result.success) {
				markSaved(form);
				onSaved();
				if (successMessage) add({ title: successMessage });
				await queryClient.cancelQueries();
				await queryClient.invalidateQueries({ refetchType: "none" });
				await onSuccess?.();
				// Revalidation can replace fields with the server's saved values.
				markSaved(form);
				onSaved();
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
	cancelHref,
	cancelAction,
	stickyActions,
	requireChanges,
	destructive,
}: FormProps) => {
	const [dirty, setDirty] = useState(false);
	const { failure, pending, submit } = useSubmitForm({
		onSave,
		onSuccess,
		successMessage,
		requireChanges,
		onSaved: () => setDirty(false),
	});
	const hydrated = useHydrated();
	const href = useLocation({ select: (location) => location.href });
	const { isFormDirty, register } = useUnsavedChanges();
	const registerForm = useCallback(
		(form: HTMLFormElement | null) => {
			const unregister = register(form);
			if (!form || !requireChanges) return unregister;
			const update = () => setDirty(isFormDirty(form));
			const observer = new MutationObserver(update);
			// Custom fields such as the category icon write to a hidden input.
			observer.observe(form, { attributes: true, attributeFilter: ["value"], subtree: true });
			return () => {
				unregister?.();
				observer.disconnect();
			};
		},
		[isFormDirty, register, requireChanges],
	);
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
		<form
			ref={registerForm}
			method="post"
			onSubmit={submit}
			onChange={requireChanges ? (event) => setDirty(isFormDirty(event.currentTarget)) : undefined}
			className="flex flex-col gap-4"
		>
			<FieldSet disabled={!hydrated || pending} className="min-w-0">
				<FieldValidation value={failure?.fieldErrors}>{children}</FieldValidation>
			</FieldSet>
			{failure && (
				<FieldError>
					{failure.error}
					{failure.reauthenticate && (
						<Link
							to="/"
							search={{ returnTo: loginReturn(href) }}
							target="_blank"
							rel="noopener"
							className="ml-2 underline underline-offset-4"
						>
							Sign in in a new tab
						</Link>
					)}
				</FieldError>
			)}
			<div
				className={cn(
					"flex flex-wrap items-center justify-end gap-2",
					stickyActions &&
						"sticky bottom-0 z-20 border-t bg-background p-2 sm:static sm:border-0 sm:bg-transparent sm:p-0",
				)}
			>
				{cancelAction}
				{cancelHref && (
					<Link
						to={cancelHref}
						href={cancelHref}
						className={buttonVariants({ variant: "outline", size: "lg" })}
					>
						Cancel
					</Link>
				)}
				<Button
					type="submit"
					size="lg"
					variant={destructive ? "destructive" : "default"}
					disabled={!hydrated || pending || (requireChanges && !dirty)}
				>
					{pending ? "Saving…" : submitLabel}
				</Button>
			</div>
		</form>
	);
};
