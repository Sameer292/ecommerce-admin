import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AdminForm } from "@/components/admin/admin-form";
import { NotesField, SelectField, TextField } from "@/components/admin/form-fields";
import { FormSection } from "@/components/admin/form-section";
import { NativeSelectOption } from "@/components/ui/native-select";
import { orderStatusLabels, orderTransitions } from "./order-options";
import type { Order } from "./order.types";
import { writeOrder } from "./orders.functions";

const FulfillmentFields = ({ order }: { order: Order }) => (
	<>
		<input type="hidden" name="id" value={order.id} />
		<input type="hidden" name="version" value={order.updatedAt.toISOString()} />
		<SelectField name="status" required label="Fulfillment status" defaultValue={order.status}>
			{[order.status, ...orderTransitions[order.status]].map((status) => (
				<NativeSelectOption key={status} value={status}>
					{orderStatusLabels[status]}
				</NativeSelectOption>
			))}
		</SelectField>
		<TextField
			name="trackingNumber"
			label="Tracking number"
			maxLength={100}
			defaultValue={order.trackingNumber}
		/>
		<NotesField name="notes" label="Internal notes" maxLength={2000} defaultValue={order.notes} />
	</>
);

export const FulfillmentForm = ({ order, editable }: { order: Order; editable: boolean }) => {
	const router = useRouter();
	const save = useServerFn(writeOrder);
	return (
		<FormSection title="Fulfillment">
			<AdminForm
				onSave={editable ? (data) => save({ data }) : undefined}
				onSuccess={() => router.invalidate()}
				requireChanges
				submitLabel="Save fulfillment"
				successMessage="Fulfillment saved."
			>
				<FulfillmentFields order={order} />
			</AdminForm>
		</FormSection>
	);
};
