import { createFileRoute } from "@tanstack/react-router";
import { handleStoreCatalog } from "@/features/store-integration/catalog.server";

export const Route = createFileRoute("/api/store/catalog")({
	server: { handlers: { GET: handleStoreCatalog } },
});
