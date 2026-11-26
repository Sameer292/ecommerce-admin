import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client.server";
import { orders, orderShipments } from "@/db/schema/orders";
import { importOrder } from "./import-order.server";
import { checkIntegrationToken } from "./integration-auth.server";
import { integrationError, withIntegrationBody } from "./integration-request.server";
import {
	importOrderSchema,
	orderStatusQuerySchema,
	paymentUpdateSchema,
} from "./integration-validation";
import { updatePayment } from "./payment.server";
import { trackOrderSync } from "./order-sync.server";

export const findStoreOrderStatus = async (number: string) => {
	const [order] = await db
		.select({
			id: orders.id,
			number: orders.number,
			status: orders.status,
			paymentStatus: orders.paymentStatus,
			trackingNumber: orders.trackingNumber,
			updatedAt: orders.updatedAt,
		})
		.from(orders)
		.where(eq(orders.number, number));
	if (!order) return;
	const { id, ...status } = order;
	const shipments = await db
		.select({
			carrier: orderShipments.carrier,
			service: orderShipments.service,
			trackingNumber: orderShipments.trackingNumber,
			trackingUrl: orderShipments.trackingUrl,
			dispatchedAt: orderShipments.dispatchedAt,
		})
		.from(orderShipments)
		.where(eq(orderShipments.orderId, id))
		.orderBy(asc(orderShipments.dispatchedAt), asc(orderShipments.id));
	return { ...status, shipments };
};

export const handleOrderStatus = async ({ request }: { request: Request }) => {
	const blocked = checkIntegrationToken(request);
	if (blocked) return blocked;
	const parsed = orderStatusQuerySchema.safeParse({
		number: new URL(request.url).searchParams.get("number"),
	});
	if (!parsed.success)
		return Response.json({ error: "Send a valid order number." }, { status: 400 });
	try {
		const order = await findStoreOrderStatus(parsed.data.number);
		return order
			? Response.json(order)
			: Response.json({ error: "Order not found." }, { status: 404 });
	} catch (error) {
		return integrationError(error);
	}
};

export const handleImportOrder = ({ request }: { request: Request }) =>
	withIntegrationBody(request, importOrderSchema, (input) =>
		trackOrderSync(input.number, "import", async () => {
			const { id, created } = await importOrder(input);
			return Response.json({ id, number: input.number }, { status: created ? 201 : 200 });
		}),
	);

export const handlePaymentUpdate = ({ request }: { request: Request }) =>
	withIntegrationBody(request, paymentUpdateSchema, (input) =>
		trackOrderSync(input.number, "payment", async () =>
			Response.json({
				...(await updatePayment(input)),
				number: input.number,
				status: input.status,
			}),
		),
	);
