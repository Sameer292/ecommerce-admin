import { createFileRoute } from "@tanstack/react-router";
import { handleStockMovement } from "@/features/store-integration/inventory.server";

export const Route = createFileRoute("/api/store/inventory")({
	server: { handlers: { POST: handleStockMovement } },
});
