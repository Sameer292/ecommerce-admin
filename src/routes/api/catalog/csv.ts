import { createFileRoute } from "@tanstack/react-router";
import { can } from "@/features/auth/permissions";
import { getStaff } from "@/features/auth/session.server";
import { exportCatalogCsv } from "@/features/catalog/catalog-csv.server";

export const Route = createFileRoute("/api/catalog/csv")({
	server: {
		handlers: {
			GET: async () => {
				const staff = await getStaff();
				if (!staff) return new Response("Sign in to export the catalog.", { status: 401 });
				if (!can(staff.role, "manageCommerce")) return new Response("Forbidden", { status: 403 });
				return new Response(await exportCatalogCsv(), {
					headers: {
						"Content-Type": "text/csv; charset=utf-8",
						"Content-Disposition": 'attachment; filename="catalog.csv"',
						"Cache-Control": "private, no-store",
					},
				});
			},
		},
	},
});
