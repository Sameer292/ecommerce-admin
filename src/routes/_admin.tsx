import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/admin-shell";
import { readWorkspace } from "@/features/auth/session.functions";
import { loginReturn } from "@/features/auth/login-return";

type Workspace = NonNullable<Awaited<ReturnType<typeof readWorkspace>>>;

const AdminLayout = () => <AdminShell {...Route.useRouteContext()} />;

export const Route = createFileRoute("/_admin")({
	beforeLoad: async ({ context: { queryClient }, matches, location }): Promise<Workspace> => {
		const match = matches.find((match) => match.routeId === "/_admin");
		if (match?.invalid) await queryClient.invalidateQueries({ refetchType: "none" });
		const workspace = await queryClient.query({
			queryKey: ["workspace"],
			queryFn: ({ signal }) => readWorkspace({ signal }),
			staleTime: Infinity,
		});
		if (!workspace) throw redirect({ to: "/", search: { returnTo: loginReturn(location.href) } });
		return workspace;
	},
	loader: ({ context: { staff, store } }): Workspace => ({ staff, store }),
	staleTime: Infinity,
	component: AdminLayout,
});
