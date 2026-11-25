import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AdminForm } from "@/components/admin/admin-form";
import { NotesField, SelectField, TextField } from "@/components/admin/form-fields";
import { FormSection } from "@/components/admin/form-section";
import { NativeSelectOption } from "@/components/ui/native-select";
import {
	canChangePaymentCollection,
	fulfillmentPaymentProblem,
	orderStatusLabels,
	orderTransitions,
} from "./order-options";
import type { Order } from "./order.types";
import { writeOrder } from "./orders.functions";

const FulfillmentFields = ({ order }: { order: Order }) => {
	const [cashOnDelivery, setCashOnDelivery] = useState(order.cashOnDelivery);
	const options = [order.status, ...orderTransitions[order.status]].map((status) => ({
		status,
		blocked: fulfillmentPaymentProblem(order.status, status, order.paymentStatus, cashOnDelivery),
	}));
	return (
		<>
			<input type="hidden" name="id" value={order.id} />
			<input type="hidden" name="version" value={order.updatedAt.toISOString()} />
			{canChangePaymentCollection(order.status, order.paymentStatus) && (
				<SelectField
					name="cashOnDelivery"
					label="Payment collection"
					value={cashOnDelivery ? "cod" : "prepaid"}
					onChange={(event) => setCashOnDelivery(event.currentTarget.value === "cod")}
				>
					<NativeSelectOption value="prepaid">Prepaid</NativeSelectOption>
					<NativeSelectOption value="cod">Cash on delivery</NativeSelectOption>
				</SelectField>
			)}
			<SelectField
				name="status"
				required
				label="Fulfillment status"
				defaultValue={order.status}
				hint={options.find(({ blocked }) => blocked)?.blocked}
			>
				{options.map(({ status, blocked }) => (
					<NativeSelectOption key={status} value={status} disabled={Boolean(blocked)}>
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
};

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
