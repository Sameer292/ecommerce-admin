import { createFileRoute } from "@tanstack/react-router";
import { enum as ZEnum, object as ZObject, uuid as ZUuid } from "zod";
import { acknowledgeNotification, claimNotification } from "@/features/orders/notifications.server";
import { checkIntegrationToken } from "@/features/store-integration/integration-auth.server";
import {
	integrationError,
	withIntegrationBody,
} from "@/features/store-integration/integration-request.server";

const acknowledgementSchema = ZObject({
	id: ZUuid(),
	claimId: ZUuid(),
	status: ZEnum(["sent", "failed"]),
});

export const Route = createFileRoute("/api/store/notifications")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const blocked = checkIntegrationToken(request);
				if (blocked) return blocked;
				try {
					const job = await claimNotification();
					return job ? Response.json(job) : new Response(null, { status: 204 });
				} catch (error) {
					return integrationError(error);
				}
			},
			PATCH: ({ request }) =>
				withIntegrationBody(request, acknowledgementSchema, async ({ id, claimId, status }) =>
					(await acknowledgeNotification(id, claimId, status))
						? new Response(null, { status: 204 })
						: Response.json({ error: "This claim is no longer active." }, { status: 409 }),
				),
		},
	},
});
