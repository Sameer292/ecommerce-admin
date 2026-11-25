import { useQueryClient } from "@tanstack/react-query";
import { useHydrated } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, FieldSet } from "@/components/ui/field";
import type { MutationResult } from "@/server/mutation.types";

type FormProps = {
	children: ReactNode;
	onSave?: (form: FormData) => Promise<MutationResult>;
	onSuccess?: () => unknown;
	submitLabel?: string;
	destructive?: boolean;
};

const useSubmitForm = ({ onSave, onSuccess }: Pick<FormProps, "onSave" | "onSuccess">) => {
	const queryClient = useQueryClient();
	const [error, setError] = useState("");
	const [pending, setPending] = useState(false);
	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!onSave || pending) return;
		setError("");
		setPending(true);
		try {
			const result = await onSave(new FormData(event.currentTarget));
			if (result.success) {
				await queryClient.cancelQueries();
				await queryClient.invalidateQueries({ refetchType: "none" });
				await onSuccess?.();
			} else setError(result.error);
		} catch {
			setError("Couldn’t complete the request. Please try again.");
		} finally {
			setPending(false);
		}
	};
	return { error, pending, submit };
};

export const AdminForm = ({
	children,
	onSave,
	onSuccess,
	submitLabel = "Save changes",
	destructive,
}: FormProps) => {
	const { error, pending, submit } = useSubmitForm({ onSave, onSuccess });
	const hydrated = useHydrated();
	return (
		<form method="post" onSubmit={submit} className="flex flex-col gap-4">
			<FieldSet disabled={!onSave || !hydrated || pending} className="min-w-0">
				{children}
			</FieldSet>
			{error && <FieldError>{error}</FieldError>}
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
