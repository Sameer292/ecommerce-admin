import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AdminForm } from "@/components/admin/admin-form";
import { NotesField, TextField } from "@/components/admin/form-fields";
import { Field, FieldLabel } from "@/components/ui/field";
import type { Customer } from "./customer.types";
import { mergeCustomer } from "./customers.functions";

export const CustomerMerge = ({ customer }: { customer: Customer }) => {
	const router = useRouter();
	const merge = useServerFn(mergeCustomer);
	return (
		<details className="max-w-2xl space-y-3 rounded-xl border p-4">
			<summary className="cursor-pointer font-medium">Merge this duplicate profile</summary>
			<p className="text-sm text-muted-foreground">
				Enter the email of the customer profile to keep. Orders and storefront identities move to
				that profile. Existing order contact snapshots stay with their orders.
			</p>
			<AdminForm
				onSave={(data) => merge({ data })}
				onSuccess={() => router.invalidate()}
				submitLabel="Merge customer"
				successMessage="Duplicate profile merged."
			>
				<input type="hidden" name="id" value={customer.id} />
				<input type="hidden" name="version" value={customer.version} />
				<TextField
					type="email"
					name="targetEmail"
					label="Email of profile to keep"
					maxLength={254}
					required
				/>
				<NotesField name="reason" label="Reason for merge" maxLength={500} required />
				<Field orientation="horizontal" className="items-center justify-start">
					<input id="confirm-customer-merge" type="checkbox" name="confirm" required />
					<FieldLabel htmlFor="confirm-customer-merge">
						I checked that both profiles belong to the same customer.
					</FieldLabel>
				</Field>
			</AdminForm>
		</details>
	);
};
