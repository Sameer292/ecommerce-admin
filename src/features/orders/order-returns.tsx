import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import type { ReactNode } from "react";
import { AdminForm } from "@/components/admin/admin-form";
import { NotesField, SelectField, TextField } from "@/components/admin/form-fields";
import { FormSection } from "@/components/admin/form-section";
import { Field, FieldLabel } from "@/components/ui/field";
import { formatCount, formatDateTime } from "@/lib/format";
import { returnLabels } from "./order-options";
import type { listOrderReturns } from "./order-returns.server";
import { saveOrderReturn } from "./orders.functions";

type Returns = Awaited<ReturnType<typeof listOrderReturns>>;

const ReturnForm = ({
	id,
	orderId,
	submitLabel,
	children,
}: {
	id: string;
	orderId: string;
	submitLabel: string;
	children: ReactNode;
}) => {
	const router = useRouter();
	const save = useServerFn(saveOrderReturn);
	return (
		<AdminForm
			onSave={(data) => save({ data })}
			onSuccess={() => router.invalidate()}
			submitLabel={submitLabel}
			successMessage="Return updated."
		>
			<input type="hidden" name="id" value={id} />
			<input type="hidden" name="orderId" value={orderId} />
			{children}
		</AdminForm>
	);
};

const ReturnProgress = ({ entry }: { entry: Returns["returns"][number] }) => {
	const { record, item } = entry;
	if (record.status === "requested") {
		return (
			<ReturnForm id={record.id} orderId={record.orderId} submitLabel="Update request">
				<SelectField
					name="action"
					label="Return decision"
					required
					placeholder="Choose a decision"
					items={[
						{ value: "approve", label: "Approve return" },
						{ value: "reject", label: "Reject return" },
					]}
				/>
			</ReturnForm>
		);
	}
	if (record.status !== "approved") return null;
	return (
		<ReturnForm id={record.id} orderId={record.orderId} submitLabel="Mark received">
			<input type="hidden" name="action" value="receive" />
			{item.productId && (
				<Field orientation="horizontal" className="items-center justify-start">
					<input type="checkbox" id={`restock-${record.id}`} name="restock" />
					<FieldLabel htmlFor={`restock-${record.id}`}>Return sellable units to stock</FieldLabel>
				</Field>
			)}
		</ReturnForm>
	);
};

export const OrderReturns = ({
	orderId,
	data,
	returnId,
	zone,
	editable,
	dispatched,
}: {
	orderId: string;
	data: Returns;
	returnId: string;
	zone: string;
	editable: boolean;
	dispatched: boolean;
}) => (
	<FormSection title="Returns">
		{data.returns.length ? (
			<ul className="flex flex-col gap-3">
				{data.returns.map((entry) => {
					const { record, item } = entry;
					return (
						<li key={record.id} className="flex flex-col gap-2 rounded-lg border p-3 text-sm">
							<div className="flex flex-wrap justify-between gap-2">
								<p className="font-medium">
									{formatCount(record.quantity)} × {item.name} ({item.sku})
								</p>
								<p>
									{returnLabels[record.status]}
									{record.restocked ? " · Restocked" : ""}
								</p>
							</div>
							<p>{record.reason}</p>
							<time dateTime={record.updatedAt.toISOString()} className="text-muted-foreground">
								{formatDateTime(record.updatedAt, zone)} · {zone}
							</time>
							{record.status === "received" && (
								<p className="wrap-anywhere text-muted-foreground">
									Use return ID {record.id} when recording the provider refund.
								</p>
							)}
							{editable && <ReturnProgress entry={entry} />}
						</li>
					);
				})}
			</ul>
		) : (
			<p className="text-sm text-muted-foreground">No returns recorded.</p>
		)}
		{editable && dispatched && data.items.length > 0 && (
			<details className="rounded-lg border p-3">
				<summary className="cursor-pointer text-sm font-medium">Request a return</summary>
				<div className="mt-3">
					<ReturnForm id={returnId} orderId={orderId} submitLabel="Create return request">
						<input type="hidden" name="action" value="request" />
						<SelectField
							name="itemId"
							label="Item"
							required
							placeholder="Choose an item"
							items={data.items.map(({ id, name, sku }) => ({
								value: id,
								label: `${name} (${sku})`,
							}))}
						/>
						<TextField
							name="quantity"
							label="Units to return"
							type="number"
							min={1}
							max={1_000_000}
							required
						/>
						<NotesField name="reason" label="Reason" maxLength={500} required />
					</ReturnForm>
				</div>
			</details>
		)}
	</FormSection>
);
