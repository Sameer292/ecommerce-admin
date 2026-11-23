import { importOrder } from "./import-order.server";
import { withIntegrationBody } from "./integration-request.server";
import { importOrderSchema, paymentUpdateSchema } from "./integration-validation";
import { updatePayment } from "./payment.server";

export const handleImportOrder = ({ request }: { request: Request }) =>
	withIntegrationBody(request, importOrderSchema, async (input) => {
		const { id, created } = await importOrder(input);
		return Response.json({ id, number: input.number }, { status: created ? 201 : 200 });
	});

export const handlePaymentUpdate = ({ request }: { request: Request }) =>
	withIntegrationBody(request, paymentUpdateSchema, async (input) =>
		Response.json({ ...(await updatePayment(input)), number: input.number, status: input.status }),
	);
