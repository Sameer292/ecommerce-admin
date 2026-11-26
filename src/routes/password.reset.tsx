import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AdminForm } from "@/components/admin/admin-form";
import { TextField } from "@/components/admin/form-fields";
import { AuthLayout } from "@/features/auth/auth-layout";
import { requestStaffPasswordReset } from "@/features/auth/password.functions";

const PasswordReset = () => {
	const requestReset = useServerFn(requestStaffPasswordReset);
	const [sent, setSent] = useState(false);
	return (
		<AuthLayout title="Reset password" description="Enter the email for your staff account.">
			{sent ? (
				<p role="status" className="text-sm">
					If this email belongs to an active staff account, a password link is on its way.
				</p>
			) : (
				<AdminForm
					onSave={(data) => requestReset({ data })}
					onSuccess={() => setSent(true)}
					submitLabel="Send password link"
				>
					<TextField
						name="email"
						label="Email"
						type="email"
						autoComplete="username"
						required
						maxLength={254}
					/>
				</AdminForm>
			)}
			<Link to="/login" className="mt-3 block w-fit text-sm font-medium underline">
				Back to sign in
			</Link>
		</AuthLayout>
	);
};

export const Route = createFileRoute("/password/reset")({ component: PasswordReset });
