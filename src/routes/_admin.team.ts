import { createFileRoute, redirect } from "@tanstack/react-router";
import { can } from "@/features/auth/permissions";

export const Route = createFileRoute("/_admin/team")({
	beforeLoad: ({ context }) => {
		if (!can(context.staff.role, "manageTeam")) throw redirect({ to: "/" });
	},
});
