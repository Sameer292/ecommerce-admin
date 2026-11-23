import { useHydrated } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "./auth-client";

const signIn = (form: HTMLFormElement) => {
	const data = new FormData(form);
	return authClient.signIn.email({
		email: String(data.get("email")).trim().toLowerCase(),
		password: String(data.get("password")),
	});
};

const LoginFields = () => (
	<FieldGroup>
		<Field>
			<FieldLabel htmlFor="email">Email</FieldLabel>
			<Input
				id="email"
				name="email"
				type="email"
				autoComplete="username"
				required
				className="h-10"
			/>
		</Field>
		<Field>
			<FieldLabel htmlFor="password">Password</FieldLabel>
			<Input
				id="password"
				name="password"
				type="password"
				autoComplete="current-password"
				required
				className="h-10"
			/>
		</Field>
	</FieldGroup>
);

const useSignIn = () => {
	const [pending, setPending] = useState(false);
	const [error, setError] = useState("");
	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setPending(true);
		setError("");
		try {
			const result = await signIn(event.currentTarget);
			if (!result.error) return window.location.assign("/");
			setError(
				result.error.status === 429
					? "Too many attempts. Try again in a minute."
					: "Sign-in failed. Check your email and password.",
			);
		} catch {
			setError("Couldn’t connect. Try again.");
		}
		setPending(false);
	};
	return { error, pending, submit };
};

export const LoginForm = () => {
	const { error, pending, submit } = useSignIn();
	const hydrated = useHydrated();
	return (
		<form method="post" className="flex flex-col gap-5" onSubmit={submit}>
			<LoginFields />
			{error && (
				<Alert variant="destructive" role="alert">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}
			<Button type="submit" size="lg" className="h-10" disabled={!hydrated || pending}>
				{pending ? "Signing in…" : "Sign in"}
			</Button>
		</form>
	);
};
