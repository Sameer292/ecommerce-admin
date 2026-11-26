import { createFileRoute } from "@tanstack/react-router";
import { can } from "@/features/auth/permissions";
import { getStaff } from "@/features/auth/session.server";
import { exportCustomerData } from "@/features/customers/customer-privacy.server";
import { getStoreSettings } from "@/features/settings/settings.server";
import { idSchema } from "@/lib/validation";

export const Route = createFileRoute("/api/customers/$customerId/export")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const staff = await getStaff();
				if (!staff) return new Response("Sign in to export customer records.", { status: 401 });
				if (!can(staff.role, "manageCommerce")) return new Response("Forbidden", { status: 403 });
				const parsed = idSchema.safeParse({ id: params.customerId });
				if (!parsed.success) return new Response("Customer not found.", { status: 404 });
				const data = await exportCustomerData(parsed.data.id);
				if (!data) return new Response("Customer not found.", { status: 404 });
				const { currency } = await getStoreSettings();
				return Response.json(
					{ currency, ...data },
					{
						headers: {
							"Content-Disposition": `attachment; filename="customer-${parsed.data.id}.json"`,
							"Cache-Control": "private, no-store",
						},
					},
				);
			},
		},
	},
});
