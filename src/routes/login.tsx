import { createFileRoute, redirect } from "@tanstack/react-router";
import { loginReturn } from "@/features/auth/login-return";

export const Route = createFileRoute("/login")({
	validateSearch: (search): { returnTo?: string } => ({ returnTo: loginReturn(search.returnTo) }),
	beforeLoad: ({ search }) => {
		throw redirect({ to: "/", search, replace: true });
	},
});
