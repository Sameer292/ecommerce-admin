import { createFileRoute } from "@tanstack/react-router";
import { readHealth } from "@/server/health.server";

export const Route = createFileRoute("/api/health")({
	server: { handlers: { GET: readHealth } },
});
