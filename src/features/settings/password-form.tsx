import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AdminForm } from "@/components/admin/admin-form";
import { TextField } from "@/components/admin/form-fields";
import { FormSection } from "@/components/admin/form-section";
import { changeStaffPassword } from "@/features/auth/auth.functions";

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
			maxLength={72}
			required
		/>
		<TextField
			label="Confirm new password"
			name="confirmation"
			type="password"
			autoComplete="new-password"
			minLength={12}
			maxLength={72}
			required
		/>
	</>
);

export const PasswordForm = ({ email }: { email: string }) => {
	const [changed, setChanged] = useState(0);
	const changePassword = useServerFn(changeStaffPassword);
	return (
		<FormSection title="Your account" description={email}>
			<AdminForm
				key={changed}
				onSave={(data) => changePassword({ data })}
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
