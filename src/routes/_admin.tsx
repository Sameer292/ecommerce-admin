import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/admin-shell";
import { readWorkspace } from "@/features/auth/session.functions";

const AdminLayout = () => <AdminShell {...Route.useRouteContext()} />;

export const Route = createFileRoute("/_admin")({
	beforeLoad: () => readWorkspace(),
	component: AdminLayout,
});
