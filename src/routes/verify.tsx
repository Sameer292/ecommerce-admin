import { createFileRoute, redirect, useHydrated } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AdminForm } from "@/components/admin/admin-form";
import { SelectField, TextField } from "@/components/admin/form-fields";
import { SignOut } from "@/components/admin/sign-out";
import { Button } from "@/components/ui/button";
import { NativeSelectOption } from "@/components/ui/native-select";
import { AuthLayout } from "@/features/auth/auth-layout";
import { loginReturn } from "@/features/auth/login-return";
import {
	readVerifiedFactors,
	startAuthenticator,
	verifyAuthenticator,
} from "@/features/auth/mfa.functions";
import { readSignInStep } from "@/features/auth/session.functions";

const VerifyPage = () => {
	const { returnTo } = Route.useSearch();
	const factors = Route.useLoaderData();
	const start = useServerFn(startAuthenticator);
	const verify = useServerFn(verifyAuthenticator);
	const hydrated = useHydrated();
	const [setup, setSetup] = useState<{ id: string; qrCode: string; secret: string }>();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const begin = async () => {
		setBusy(true);
		setError("");
		try {
			const result = await start();
			if (result.data) setSetup(result.data);
			else setError(result.error);
		} catch {
			setError("Couldn’t connect. Try again.");
		} finally {
			setBusy(false);
		}
	};
	return (
		<AuthLayout
			title="Verify your sign-in"
			description={
				factors.length
					? "Enter a code from your authenticator app."
					: "Set up an authenticator app to continue."
			}
		>
			<div className="flex flex-col gap-4">
				{!factors.length && !setup && (
					<Button type="button" disabled={!hydrated || busy} onClick={begin}>
						Set up authenticator
					</Button>
				)}
				{error && (
					<p role="alert" className="text-sm text-destructive">
						{error}
					</p>
				)}
				{setup && (
					<div className="flex flex-col gap-2 text-sm">
						<p>Scan this QR code or enter the setup key in your authenticator app.</p>
						<img
							alt="Authenticator setup QR code"
							src={setup.qrCode}
							className="size-40 rounded-md bg-white p-2"
						/>
						<p>
							Setup key{" "}
							<code data-testid="totp-setup-key" className="select-all wrap-anywhere font-mono">
								{setup.secret}
							</code>
						</p>
					</div>
				)}
				{(setup || factors.length > 0) && (
					<AdminForm
						onSave={(data) => verify({ data })}
						onSuccess={() => window.location.assign(returnTo ?? "/")}
						submitLabel="Verify sign-in"
					>
						{factors.length > 1 ? (
							<SelectField name="factorId" label="Authenticator" defaultValue={factors[0].id}>
								{factors.map(({ id, name }) => (
									<NativeSelectOption key={id} value={id}>
										{name}
									</NativeSelectOption>
								))}
							</SelectField>
						) : (
							<input type="hidden" name="factorId" value={setup?.id ?? factors[0]?.id} />
						)}
						<TextField
							name="code"
							label="Authenticator code"
							inputMode="numeric"
							autoComplete="one-time-code"
							pattern="[0-9]{6}"
							maxLength={6}
							required
						/>
					</AdminForm>
				)}
				<SignOut />
			</div>
		</AuthLayout>
	);
};

export const Route = createFileRoute("/verify")({
	validateSearch: (search): { returnTo?: string } => ({ returnTo: loginReturn(search.returnTo) }),
	beforeLoad: async ({ search }) => {
		const step = await readSignInStep();
		if (step === "signin") throw redirect({ to: "/login", search });
		if (step === "ready") throw redirect({ href: search.returnTo ?? "/" });
	},
	loader: () => readVerifiedFactors(),
	component: VerifyPage,
});
