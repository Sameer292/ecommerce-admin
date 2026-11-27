import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { AuthLayout } from "@/features/auth/auth-layout";
import { LoginForm } from "@/features/auth/login-form";
import { loginReturn } from "@/features/auth/login-return";
import { readSignInStep } from "@/features/auth/session.functions";
import { defaultRange, overviewSearchSchema } from "@/features/overview/overview-validation";

const LoginPage = () => (
	<AuthLayout title="Sign in" description="Use your staff account to access the store.">
		<LoginForm returnTo={Route.useSearch().returnTo} />
		<Link to="/password/reset" className="mt-3 block w-fit text-sm font-medium underline">
			Forgot password?
		</Link>
	</AuthLayout>
);

export const Route = createFileRoute("/")({
	validateSearch: (search): { returnTo?: string } => {
		const { range } = overviewSearchSchema.parse(search);
		return {
			returnTo:
				loginReturn(search.returnTo) ??
				(range === defaultRange ? undefined : `/dashboard?range=${range}`),
		};
	},
	beforeLoad: async ({ search }) => {
		const step = await readSignInStep();
		if (step === "ready") throw redirect({ href: search.returnTo ?? "/dashboard", replace: true });
		if (step === "password") throw redirect({ to: "/password/set" });
	},
	component: LoginPage,
});
