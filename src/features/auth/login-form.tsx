import { useHydrated } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { FieldValidation, TextField } from "@/components/admin/form-fields";
import type { MutationFailure } from "@/server/mutation.types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { signInStaff } from "./auth.functions";

const LoginFields = () => (
	<FieldGroup>
		<TextField
			label="Email"
			name="email"
			type="email"
			autoComplete="username"
			required
			className="h-10"
		/>
		<TextField
			label="Password"
			name="password"
			type="password"
			autoComplete="current-password"
			required
			className="h-10"
		/>
	</FieldGroup>
);

const useSignIn = (returnTo?: string) => {
	const signIn = useServerFn(signInStaff);
	const [pending, setPending] = useState(false);
	const [failure, setFailure] = useState<MutationFailure>();
	const form = useRef<HTMLFormElement>(null);
	useEffect(() => {
		if (failure?.fieldErrors)
			form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
	}, [failure]);
	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setPending(true);
		setFailure(undefined);
		try {
			const result = await signIn({ data: new FormData(event.currentTarget) });
			if (result.success) return window.location.assign(returnTo ?? "/dashboard");
			setFailure(result);
		} catch {
			setFailure({ success: false, error: "Couldn’t connect. Try again." });
		}
		setPending(false);
	};
	return { failure, form, pending, submit };
};

export const LoginForm = ({ returnTo }: { returnTo?: string }) => {
	const { failure, form, pending, submit } = useSignIn(returnTo);
	const hydrated = useHydrated();
	return (
		<form ref={form} method="post" className="flex flex-col gap-5" onSubmit={submit}>
			<FieldValidation value={failure?.fieldErrors}>
				<LoginFields />
			</FieldValidation>
			{failure && (
				<Alert variant="destructive" role="alert">
					<AlertDescription>{failure.error}</AlertDescription>
				</Alert>
			)}
			<Button type="submit" size="lg" disabled={!hydrated || pending}>
				{pending ? "Signing in…" : "Sign in"}
			</Button>
		</form>
	);
};
