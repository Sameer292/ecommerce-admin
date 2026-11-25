import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { requireStaff, withStaffMutation } from "@/features/auth/session.server";
import { getStoreSettings } from "@/features/settings/settings.server";
import { refundedAmount } from "@/features/store-integration/payment.server";
import { formDataSchema, idSchema } from "@/lib/validation";
import { mutate } from "@/server/mutation.server";
import {
	findOrder,
	listOrderActivity,
	listOrderItems,
	listPaymentEvents,
	saveOrder,
} from "./order-detail.server";
import { orderDetailSearchSchema, orderFormSchema, orderSearchSchema } from "./order-validation";
import { listOrders } from "./orders.server";
import { orderReturnSchema } from "./return-validation";
import { listOrderReturns, writeReturn } from "./order-returns.server";
import { shipmentSchema } from "./shipment-validation";
import { listOrderShipments, saveShipment } from "./shipments.server";

export const readOrders = createServerFn()
	.validator(orderSearchSchema)
	.handler(async ({ data }) => {
		await requireStaff();
		const { timeZone } = await getStoreSettings();
		return listOrders(data, undefined, timeZone);
	});

export const readOrder = createServerFn()
	.validator(idSchema.extend(orderDetailSearchSchema.shape))
	.handler(async ({ data }) => {
		await requireStaff();
		const [detail, items, activity, payments, shipping, returns, refundedMinor] = await Promise.all(
			[
				findOrder(data.id),
				listOrderItems(data.id, data.page, data.sort),
				listOrderActivity(data.id, data.activity, data.activitySort),
				listPaymentEvents(data.id, data.payments),
				listOrderShipments(data.id),
				listOrderReturns(data.id),
				refundedAmount(data.id),
			],
		);
		if (!detail) throw notFound();
		return {
			...detail,
			items,
			activity,
			payments,
			shipping,
			returns,
			refundedMinor,
			shipmentId: crypto.randomUUID(),
			returnId: crypto.randomUUID(),
		};
	});

export const writeOrder = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(({ data }) =>
		withStaffMutation("manageCommerce", (staff) =>
			mutate(orderFormSchema, data, (values) => saveOrder(values, staff.id)),
		),
	);

export const writeShipment = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(({ data }) =>
		withStaffMutation("manageCommerce", (staff) =>
			mutate(shipmentSchema, data, (values) => saveShipment(values, staff.id)),
		),
	);

export const saveOrderReturn = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(({ data }) =>
		withStaffMutation("manageCommerce", (staff) =>
			mutate(orderReturnSchema, data, (values) => writeReturn(values, staff.id)),
		),
	);
