import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AdminForm } from "@/components/admin/admin-form";
import { TextField } from "@/components/admin/form-fields";
import { FormSection } from "@/components/admin/form-section";
import { writeStoreSettings } from "./settings.functions";
import type { StoreSettings } from "./settings.types";

const StoreFields = ({ store }: { store: StoreSettings }) => (
	<>
		<input type="hidden" name="version" value={store.version} />
		<TextField name="name" label="Store name" defaultValue={store.name} maxLength={80} required />
		<TextField
			name="contactEmail"
			label="Contact email"
			defaultValue={store.contactEmail}
			type="email"
			maxLength={254}
		/>
		<TextField
			name="timeZone"
			label="Time zone"
			defaultValue={store.timeZone}
			maxLength={100}
			hint="Use an IANA name, such as Asia/Kathmandu or America/New_York."
			required
		/>
		<TextField
			label="Currency"
			defaultValue={store.currency}
			readOnly
			hint="Configured for this deployment."
		/>
	</>
);

export const StoreSettingsForm = ({
	store,
	editable,
}: {
	store: StoreSettings;
	editable: boolean;
}) => {
	const save = useServerFn(writeStoreSettings);
	const router = useRouter();
	return (
		<FormSection
			title="Store profile"
			description="Controls the workspace name, contact, and local reporting time."
		>
			<AdminForm
				onSave={editable ? (data) => save({ data }) : undefined}
				onSuccess={() => router.invalidate()}
				requireChanges
				submitLabel="Save settings"
				successMessage="Store settings saved."
			>
				<StoreFields key={JSON.stringify(store)} store={store} />
			</AdminForm>
		</FormSection>
	);
};
