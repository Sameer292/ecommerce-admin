import { eq } from "drizzle-orm";
import { db } from "@/db/client.server";
import { orders } from "@/db/schema/orders";
import { importOrder } from "./import-order.server";
import { checkIntegrationToken } from "./integration-auth.server";
import { integrationError, withIntegrationBody } from "./integration-request.server";
import {
	importOrderSchema,
	orderStatusQuerySchema,
	paymentUpdateSchema,
} from "./integration-validation";
import { updatePayment } from "./payment.server";

export const findStoreOrderStatus = async (number: string) => {
	const [order] = await db
		.select({
			number: orders.number,
			status: orders.status,
			paymentStatus: orders.paymentStatus,
			trackingNumber: orders.trackingNumber,
			updatedAt: orders.updatedAt,
		})
		.from(orders)
		.where(eq(orders.number, number));
	return order;
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
	withIntegrationBody(request, importOrderSchema, async (input) => {
		const { id, created } = await importOrder(input);
		return Response.json({ id, number: input.number }, { status: created ? 201 : 200 });
	});

export const handlePaymentUpdate = ({ request }: { request: Request }) =>
	withIntegrationBody(request, paymentUpdateSchema, async (input) =>
		Response.json({ ...(await updatePayment(input)), number: input.number, status: input.status }),
	);
