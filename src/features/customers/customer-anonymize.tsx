import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AdminForm } from "@/components/admin/admin-form";
import { TextField } from "@/components/admin/form-fields";
import type { Customer } from "./customer.types";
import { anonymizeCustomer } from "./customers.functions";

export const CustomerAnonymize = ({ customer }: { customer: Customer }) => {
	const router = useRouter();
	const anonymize = useServerFn(anonymizeCustomer);
	return (
		<details className="max-w-2xl space-y-3 rounded-xl border p-4">
			<summary className="cursor-pointer font-medium text-destructive">
				Anonymize customer data
			</summary>
			<p className="text-sm text-muted-foreground">
				Permanently remove personal details from this profile, merged profiles, and its orders.
				Financial records and order history are retained. Resolve open orders and returns first.
			</p>
			<AdminForm
				onSave={(data) => anonymize({ data })}
				onSuccess={() => router.invalidate()}
				submitLabel="Anonymize customer"
				successMessage="Customer data anonymized."
			>
				<input type="hidden" name="id" value={customer.id} />
				<input type="hidden" name="version" value={customer.version} />
				<TextField
					name="confirmation"
					label="Type ANONYMIZE to confirm"
					autoComplete="off"
					maxLength={9}
					required
				/>
			</AdminForm>
		</details>
	);
};
