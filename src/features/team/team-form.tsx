import { useListReturn } from "@/components/admin/record-link";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AdminForm } from "@/components/admin/admin-form";
import { SelectField, TextField } from "@/components/admin/form-fields";
import { FormSection } from "@/components/admin/form-section";
import { NativeSelectOption } from "@/components/ui/native-select";
import type { Role } from "@/features/auth/auth.types";
import { roleDescriptions, roleLabels, roles } from "@/features/auth/permissions";
import { addStaffAccount, transferStaffOwnership, writeStaffAccount } from "./team.functions";
import type { StaffAccount } from "./team.types";

const RoleField = ({ selected, options }: { selected: Role; options: readonly Role[] }) => (
	<SelectField name="role" required label="Role" defaultValue={selected}>
		{options.map((value) => (
			<NativeSelectOption key={value} value={value}>
				{roleLabels[value]}
			</NativeSelectOption>
		))}
	</SelectField>
);

const NewStaffFields = () => (
	<>
		<TextField name="name" label="Name" maxLength={80} required />
		<TextField name="email" label="Email" type="email" maxLength={254} required />
		<RoleField selected="viewer" options={roles} />
	</>
);

const RoleGuide = () => (
	<FormSection title="Role permissions">
		<dl className="flex flex-col gap-3 text-sm">
			{roles.map((role) => (
				<div key={role}>
					<dt className="font-medium">{roleLabels[role]}</dt>
					<dd className="text-muted-foreground">{roleDescriptions[role]}</dd>
				</div>
			))}
		</dl>
	</FormSection>
);

export const NewStaffForm = () => {
	const navigate = useNavigate();
	const returnHref = useListReturn("/team");
	const save = useServerFn(addStaffAccount);
	return (
		<div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
			<FormSection title="Account details">
				<AdminForm
					onSave={(data) => save({ data })}
					onSuccess={() => navigate({ href: returnHref })}
					cancelHref={returnHref}
					submitLabel="Send invitation"
					successMessage="Staff invitation sent."
				>
					<NewStaffFields />
				</AdminForm>
			</FormSection>
			<RoleGuide />
		</div>
	);
};

const EditableAccess = ({ account, version }: { account: StaffAccount; version: number }) => (
	<>
		<input type="hidden" name="id" value={account.id} />
		<input type="hidden" name="version" value={version} />
		<TextField name="name" label="Name" maxLength={80} defaultValue={account.name} required />
		<TextField
			name="email"
			label="Email"
			type="email"
			maxLength={254}
			defaultValue={account.email}
			hint="Changing a sign-in email ends that account’s existing console sessions."
			required
		/>
		<RoleField
			selected={account.role}
			options={account.role === "superuser" ? roles : ["manager", "viewer"]}
		/>
		<SelectField
			name="status"
			required
			label="Account access"
			defaultValue={account.banned ? "disabled" : "active"}
		>
			<NativeSelectOption value="active">Active</NativeSelectOption>
			<NativeSelectOption value="disabled">Disabled</NativeSelectOption>
		</SelectField>
	</>
);

export const StaffAccessForm = ({ account }: { account: StaffAccount }) => {
	const [version] = useState(account.version);
	const navigate = useNavigate();
	const returnHref = useListReturn("/team");
	const save = useServerFn(writeStaffAccount);
	return (
		<div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
			<FormSection
				title="Account access"
				description="Disable access if this account may be compromised. Confirm the staff member’s identity and secure their sign-in before re-enabling it."
			>
				<AdminForm
					onSave={(data) => save({ data })}
					onSuccess={() => navigate({ href: returnHref })}
					cancelHref={returnHref}
					requireChanges
					successMessage="Staff access saved."
				>
					<EditableAccess account={account} version={version} />
				</AdminForm>
			</FormSection>
			<RoleGuide />
		</div>
	);
};

export const OwnershipTransfer = ({ account }: { account: StaffAccount }) => {
	const transfer = useServerFn(transferStaffOwnership);
	return (
		<details className="max-w-2xl space-y-3 rounded-lg border p-4">
			<summary className="cursor-pointer font-medium">
				Transfer your ownership to this person
			</summary>
			<p className="text-sm text-muted-foreground">
				{account.name} will become a superuser. Your role will change to manager.
			</p>
			<AdminForm
				onSave={(data) => transfer({ data })}
				onSuccess={() => window.location.assign("/")}
				submitLabel="Transfer ownership"
				destructive
			>
				<input type="hidden" name="id" value={account.id} />
				<input type="hidden" name="version" value={account.version} />
				<TextField
					name="confirmation"
					label="Type TRANSFER to confirm"
					autoComplete="off"
					required
				/>
			</AdminForm>
		</details>
	);
};
