import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/admin-shell";
import { readWorkspace } from "@/features/auth/session.functions";

type Workspace = Awaited<ReturnType<typeof readWorkspace>>;

const AdminLayout = () => <AdminShell {...Route.useRouteContext()} />;

export const Route = createFileRoute("/_admin")({
	beforeLoad: async ({ context: { queryClient }, matches }): Promise<Workspace> => {
		const match = matches.find((match) => match.routeId === "/_admin");
		if (match?.invalid) await queryClient.invalidateQueries({ refetchType: "none" });
		return queryClient.fetchQuery({
			queryKey: ["workspace"],
			queryFn: ({ signal }) => readWorkspace({ signal }),
			staleTime: Infinity,
		});
	},
	loader: ({ context: { staff, store } }): Workspace => ({ staff, store }),
	staleTime: Infinity,
	component: AdminLayout,
});
