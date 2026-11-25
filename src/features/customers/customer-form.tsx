import { useListReturn } from "@/components/admin/record-link";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AdminForm } from "@/components/admin/admin-form";
import { NotesField, TextField } from "@/components/admin/form-fields";
import { FormSection } from "@/components/admin/form-section";
import type { Customer } from "./customer.types";
import { writeCustomer } from "./customers.functions";

const CustomerFields = ({ customer }: { customer?: Customer }) => (
	<FormSection title="Customer details">
		<TextField name="name" label="Name" defaultValue={customer?.name} maxLength={120} required />
		<TextField
			name="email"
			label="Email"
			type="email"
			maxLength={254}
			defaultValue={customer?.email}
			required
		/>
		<TextField
			name="phone"
			label="Phone"
			type="tel"
			maxLength={40}
			defaultValue={customer?.phone}
		/>
		<NotesField
			name="notes"
			label="Internal notes"
			defaultValue={customer?.notes}
			maxLength={2000}
		/>
	</FormSection>
);

export const CustomerForm = ({
	customer,
	editable,
}: {
	customer?: Customer;
	editable: boolean;
}) => {
	const [version] = useState(customer?.version);
	const save = useServerFn(writeCustomer);
	const navigate = useNavigate();
	const returnHref = useListReturn("/customers");
	return (
		<div className="max-w-2xl">
			<AdminForm
				onSave={editable ? (data) => save({ data }) : undefined}
				onSuccess={() => navigate({ href: returnHref })}
				submitLabel={customer ? "Save customer" : "Create customer"}
				successMessage={customer ? "Customer saved." : "Customer created."}
			>
				<input type="hidden" name="id" value={customer?.id ?? ""} />
				{customer && <input type="hidden" name="version" value={version} />}
				<CustomerFields customer={customer} />
			</AdminForm>
		</div>
	);
};
