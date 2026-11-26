import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AdminForm } from "@/components/admin/admin-form";
import { TextField } from "@/components/admin/form-fields";
import { FormSection } from "@/components/admin/form-section";
import { FieldLegend, FieldSet } from "@/components/ui/field";
import { formatCount, formatDateTime } from "@/lib/format";
import { fulfillmentPaymentProblem } from "./order-options";
import type { Order } from "./order.types";
import { writeShipment } from "./orders.functions";
import type { listOrderShipments } from "./shipments.server";

type Shipping = Awaited<ReturnType<typeof listOrderShipments>>;

const ShipmentForm = ({
	order,
	id,
	remaining,
}: {
	order: Order;
	id: string;
	remaining: Shipping["remaining"];
}) => {
	const router = useRouter();
	const save = useServerFn(writeShipment);
	return (
		<details className="rounded-lg border p-3">
			<summary className="cursor-pointer text-sm font-medium">Record a dispatched package</summary>
			<div className="mt-4">
				<AdminForm
					onSave={async (data) => {
						const lines = remaining.flatMap(({ id }) => {
							const quantity = Number(data.get(id));
							return quantity > 0 ? [{ itemId: id, quantity }] : [];
						});
						if (lines.length === 0) return { success: false, error: "Add units to this package." };
						for (const line of remaining) data.delete(line.id);
						data.set("lines", JSON.stringify(lines));
						return save({ data });
					}}
					onSuccess={() => router.invalidate()}
					submitLabel="Record package"
					successMessage="Package recorded."
				>
					<input type="hidden" name="id" value={id} />
					<input type="hidden" name="orderId" value={order.id} />
					<input type="hidden" name="version" value={order.updatedAt.toISOString()} />
					<div className="grid gap-4 sm:grid-cols-2">
						<TextField name="carrier" label="Carrier" maxLength={80} required />
						<TextField name="service" label="Shipping service" maxLength={80} />
						<TextField name="trackingNumber" label="Tracking number" maxLength={100} />
						<TextField
							name="trackingUrl"
							label="Tracking URL"
							type="url"
							maxLength={2000}
							hint="Use an HTTPS tracking URL."
						/>
					</div>
					<FieldSet>
						<FieldLegend>Units in package</FieldLegend>
						{remaining.map((line) => (
							<TextField
								key={line.id}
								name={line.id}
								type="number"
								label={`${line.name} · ${line.sku}`}
								min={0}
								max={line.remaining}
								step={1}
								defaultValue={0}
								hint={`${formatCount(line.remaining)} left to dispatch`}
							/>
						))}
					</FieldSet>
				</AdminForm>
			</div>
		</details>
	);
};

export const OrderShipments = ({
	order,
	shipping,
	shipmentId,
	editable,
	zone,
}: {
	order: Order;
	shipping: Shipping;
	shipmentId: string;
	editable: boolean;
	zone: string;
}) => {
	const canRecord = order.status === "processing" || order.status === "shipped";
	const problem = canRecord
		? fulfillmentPaymentProblem("processing", "shipped", order.paymentStatus, order.cashOnDelivery)
		: undefined;
	return (
		<FormSection title="Shipments" description={`Dispatch times shown in ${zone}.`}>
			{shipping.shipments.length ? (
				<ul className="flex flex-col gap-3">
					{shipping.shipments.map((shipment) => (
						<li key={shipment.id} className="flex flex-col gap-2 rounded-lg border p-3 text-sm">
							<div className="flex flex-wrap justify-between gap-2">
								<p className="font-medium">
									{[shipment.carrier, shipment.service].filter(Boolean).join(" · ")}
								</p>
								<time
									dateTime={shipment.dispatchedAt.toISOString()}
									className="text-muted-foreground"
								>
									{formatDateTime(shipment.dispatchedAt, zone)}
								</time>
							</div>
							{shipment.trackingUrl ? (
								<a className="self-start underline" href={shipment.trackingUrl} rel="noreferrer">
									{shipment.trackingNumber || "Track package"}
								</a>
							) : (
								shipment.trackingNumber && <p>{shipment.trackingNumber}</p>
							)}
							<ul className="list-inside list-disc text-muted-foreground">
								{shipment.items.map((item) => (
									<li key={item.itemId}>
										{formatCount(item.quantity)} × {item.name} ({item.sku})
									</li>
								))}
							</ul>
						</li>
					))}
				</ul>
			) : (
				<p className="text-sm text-muted-foreground">No packages recorded.</p>
			)}
			{editable &&
				canRecord &&
				shipping.remaining.length > 0 &&
				(problem ? (
					<p className="text-sm text-muted-foreground">{problem}</p>
				) : (
					<ShipmentForm order={order} id={shipmentId} remaining={shipping.remaining} />
				))}
		</FormSection>
	);
};
