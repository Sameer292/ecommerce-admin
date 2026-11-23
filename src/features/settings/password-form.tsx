import { useState } from "react";
import { AdminForm } from "@/components/admin/admin-form";
import { TextField } from "@/components/admin/form-fields";
import { FormSection } from "@/components/admin/form-section";
import { authClient } from "@/features/auth/auth-client";
import type { MutationResult } from "@/server/mutation.types";

const changePassword = async (data: FormData): Promise<MutationResult> => {
	const currentPassword = String(data.get("currentPassword"));
	const newPassword = String(data.get("newPassword"));
	if (newPassword !== data.get("confirmation"))
		return { success: false, error: "The new passwords don’t match." };
	const { error } = await authClient.changePassword({
		currentPassword,
		newPassword,
		revokeOtherSessions: true,
	});
	return error
		? { success: false, error: "Couldn’t change the password. Check your current password." }
		: { success: true };
};

const PasswordFields = () => (
	<>
		<TextField
			label="Current password"
			name="currentPassword"
			type="password"
			autoComplete="current-password"
			required
		/>
		<TextField
			label="New password"
			name="newPassword"
			type="password"
			autoComplete="new-password"
			minLength={12}
			maxLength={128}
			required
		/>
		<TextField
			label="Confirm new password"
			name="confirmation"
			type="password"
			autoComplete="new-password"
			minLength={12}
			maxLength={128}
			required
		/>
	</>
);

export const PasswordForm = ({ email }: { email: string }) => {
	const [changed, setChanged] = useState(0);
	return (
		<FormSection title="Your account" description={email}>
			<AdminForm
				key={changed}
				onSave={changePassword}
				onSuccess={() => setChanged((count) => count + 1)}
				submitLabel="Change password"
			>
				<PasswordFields />
			</AdminForm>
			{changed > 0 && (
				<p role="status" className="text-sm text-success">
					Password updated.
				</p>
			)}
		</FormSection>
	);
};
