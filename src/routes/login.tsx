import { createFileRoute, redirect } from "@tanstack/react-router";
import { StoreMark } from "@/components/admin/store-mark";
import { ThemeToggle } from "@/components/admin/theme-toggle";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/features/auth/login-form";
import { readStaff } from "@/features/auth/session.functions";

const LoginPage = () => (
	<main className="grid min-h-svh place-items-center px-4 py-16">
		<div className="absolute top-4 right-4">
			<ThemeToggle />
		</div>
		<div className="flex w-full max-w-sm flex-col gap-6">
			<div className="flex items-center justify-center gap-2.5">
				<StoreMark />
				<span className="font-heading text-lg font-semibold tracking-tight">
					Store admin
				</span>
			</div>
			<Card size="sm" className="gap-6 p-5 sm:p-6">
				<CardHeader className="px-0">
					<CardTitle className="font-heading text-2xl">Sign in</CardTitle>
					<CardDescription>
						Use your staff account to access the store.
					</CardDescription>
				</CardHeader>
				<CardContent className="px-0">
					<LoginForm />
				</CardContent>
			</Card>
		</div>
	</main>
);

export const Route = createFileRoute("/login")({
	beforeLoad: async () => {
		if (await readStaff()) throw redirect({ to: "/" });
	},
	component: LoginPage,
});
