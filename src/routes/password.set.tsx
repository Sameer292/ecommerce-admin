import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AdminForm } from "@/components/admin/admin-form";
import { TextField } from "@/components/admin/form-fields";
import { SignOut } from "@/components/admin/sign-out";
import { AuthLayout } from "@/features/auth/auth-layout";
import { readPasswordGrant, setStaffPasswordFromLink } from "@/features/auth/password.functions";

const PasswordSet = () => {
	const save = useServerFn(setStaffPasswordFromLink);
	const grant = Route.useLoaderData();
	return (
		<AuthLayout
			title="Choose a password"
			description="Use at least 12 characters for your staff password."
		>
			{grant === "ready" ? (
				<AdminForm
					onSave={(data) => save({ data })}
					onSuccess={() => window.location.replace("/login")}
					submitLabel="Set password"
					successMessage="Password saved. Sign in again."
				>
					<TextField
						name="password"
						label="New password"
						type="password"
						autoComplete="new-password"
						minLength={12}
						maxLength={72}
						required
					/>
					<TextField
						name="confirmation"
						label="Confirm new password"
						type="password"
						autoComplete="new-password"
						minLength={12}
						maxLength={72}
						required
					/>
				</AdminForm>
			) : (
				<Link to="/password/reset" className="text-sm font-medium underline">
					Request a new password link
				</Link>
			)}
			{grant !== "missing" && <SignOut />}
		</AuthLayout>
	);
};

export const Route = createFileRoute("/password/set")({
	loader: async () => {
		const grant = await readPasswordGrant();
		if (grant === "mfa") throw redirect({ to: "/verify", search: { returnTo: "/password/set" } });
		return grant;
	},
	headers: () => ({ "Cache-Control": "no-store" }),
	component: PasswordSet,
});
