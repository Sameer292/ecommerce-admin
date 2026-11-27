import { createFileRoute } from "@tanstack/react-router";
import { readReplenishmentAlerts } from "@/features/inventory/replenishment.server";
import { checkIntegrationToken } from "@/features/store-integration/integration-auth.server";
import { integrationError } from "@/features/store-integration/integration-request.server";
import { pageSearchSchema, pageSize } from "@/lib/pagination";

export const Route = createFileRoute("/api/store/inventory/alerts")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const blocked = await checkIntegrationToken(request, "inventory:alerts");
				if (blocked) return blocked;
				try {
					const { page } = pageSearchSchema.parse(
						Object.fromEntries(new URL(request.url).searchParams),
					);
					const { rows, total } = await readReplenishmentAlerts(page);
					return Response.json(
						{
							items: rows,
							total,
							page,
							pageSize,
						},
						{ headers: { "Cache-Control": "no-store" } },
					);
				} catch (error) {
					return integrationError(error);
				}
			},
		},
	},
});
