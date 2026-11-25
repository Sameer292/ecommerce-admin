import { createFileRoute } from "@tanstack/react-router";
import {
	handleImportOrder,
	handleOrderStatus,
	handlePaymentUpdate,
} from "@/features/store-integration/orders.server";

export const Route = createFileRoute("/api/store/orders")({
	server: {
		handlers: { GET: handleOrderStatus, POST: handleImportOrder, PATCH: handlePaymentUpdate },
	},
});
