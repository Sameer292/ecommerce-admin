import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/admin-shell";
import { readWorkspace } from "@/features/auth/session.functions";

type Workspace = Awaited<ReturnType<typeof readWorkspace>>;

const AdminLayout = () => <AdminShell {...Route.useRouteContext()} />;

export const Route = createFileRoute("/_admin")({
	// Reuse layout data so workspace requests don't delay page loaders.
	beforeLoad: ({ matches }): Workspace | Promise<Workspace> => {
		const match = matches.find((match) => match.routeId === "/_admin");
		if (match?.loaderData && !match.invalid) return match.loaderData;
		return readWorkspace();
	},
	loader: ({ context }): Workspace => context,
	staleTime: Infinity,
	component: AdminLayout,
});
