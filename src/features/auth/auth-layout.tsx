import type { ReactNode } from "react";
import { StoreMark } from "@/components/admin/store-mark";
import { ThemeToggle } from "@/components/admin/theme-toggle";
import { UnsavedChangesProvider } from "@/components/admin/unsaved-changes";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { ToastProvider } from "@/components/ui/toast";

export const AuthLayout = ({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: ReactNode;
}) => (
	<main className="grid min-h-svh place-items-center px-4 py-16">
		<div className="absolute top-4 right-4">
			<ThemeToggle />
		</div>
		<div className="flex w-full max-w-sm flex-col gap-6">
			<div className="flex items-center justify-center gap-2.5">
				<StoreMark />
				<span className="font-heading text-lg font-semibold tracking-tight">Store admin</span>
			</div>
			<Card size="sm" className="gap-6 p-5 sm:p-6">
				<CardHeader className="px-0">
					<h1 className="font-heading text-2xl font-semibold">{title}</h1>
					<CardDescription>{description}</CardDescription>
				</CardHeader>
				<CardContent className="px-0">
					<ToastProvider>
						<UnsavedChangesProvider>{children}</UnsavedChangesProvider>
					</ToastProvider>
				</CardContent>
			</Card>
		</div>
	</main>
);
