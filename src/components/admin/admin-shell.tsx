import { Menu01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Outlet, useHydrated, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ToastProvider } from "@/components/ui/toast";
import type { readWorkspace } from "@/features/auth/session.functions";
import { navigationSection } from "./navigation";
import { Sidebar } from "./sidebar";
import { ThemeToggle } from "./theme-toggle";
import { UnsavedChangesProvider } from "./unsaved-changes";

type Workspace = NonNullable<Awaited<ReturnType<typeof readWorkspace>>>;

const MobileNav = (workspace: Workspace) => {
	const [open, setOpen] = useState(false);
	const hydrated = useHydrated();
	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger
				disabled={!hydrated}
				render={<Button variant="ghost" size="icon-lg" aria-label="Open navigation" />}
			>
				<HugeiconsIcon icon={Menu01Icon} />
			</SheetTrigger>
			<SheetContent side="left" className="flex w-66 flex-col gap-0 bg-sidebar">
				<SheetTitle className="sr-only">Store navigation</SheetTitle>
				<Sidebar {...workspace} onNavigate={() => setOpen(false)} />
			</SheetContent>
		</Sheet>
	);
};

const TopBar = (workspace: Workspace) => {
	const section = useLocation({ select: ({ pathname }) => navigationSection(pathname) });
	return (
		<header className="sticky top-0 z-30 flex min-h-15 items-center justify-between gap-3 border-b bg-card px-4 sm:px-7 print:hidden">
			<div className="flex min-w-0 items-center gap-2">
				<div className="-ml-2 lg:hidden">
					<MobileNav {...workspace} />
				</div>
				<span className="truncate text-sm font-medium">{section}</span>
			</div>
			<ThemeToggle />
		</header>
	);
};

const AdminLayout = (workspace: Workspace) => (
	<div className="min-h-svh lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] print:block">
		<a
			href="#main-content"
			className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:m-2 focus:rounded-md focus:bg-card focus:p-3"
		>
			Skip to content
		</a>
		<aside className="sticky top-0 hidden h-svh overflow-y-auto border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex lg:flex-col print:hidden">
			<Sidebar {...workspace} />
		</aside>
		<div className="min-w-0">
			<TopBar {...workspace} />
			<main
				id="main-content"
				tabIndex={-1}
				className="mx-auto flex w-full max-w-350 flex-col gap-6 p-4 outline-none sm:p-7 lg:gap-8 lg:p-9 print:max-w-none print:p-0"
			>
				<Outlet />
			</main>
		</div>
	</div>
);

export const AdminShell = (workspace: Workspace) => (
	<UnsavedChangesProvider>
		<ToastProvider>
			<AdminLayout {...workspace} />
		</ToastProvider>
	</UnsavedChangesProvider>
);
