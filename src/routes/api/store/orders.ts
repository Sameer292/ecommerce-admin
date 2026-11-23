import { createFileRoute } from "@tanstack/react-router";
import { handleImportOrder, handlePaymentUpdate } from "@/features/store-integration/orders.server";

export const Route = createFileRoute("/api/store/orders")({
	server: { handlers: { POST: handleImportOrder, PATCH: handlePaymentUpdate } },
});
