import { Menu01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Outlet, useHydrated, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ToastProvider } from "@/components/ui/toast";
import type { readWorkspace } from "@/features/auth/session.functions";
import { navigationTitle } from "./navigation";
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
	const title = useLocation({ select: ({ pathname }) => navigationTitle(pathname) });
	return (
		<header className="sticky top-0 z-30 flex min-h-12 shrink-0 items-center justify-between gap-3 border-b bg-background px-4 lg:px-6 print:hidden">
			<div className="flex min-w-0 items-center gap-2">
				<div className="-ml-2 lg:hidden">
					<MobileNav {...workspace} />
				</div>
				<span className="truncate text-base font-medium">{title}</span>
			</div>
			<ThemeToggle />
		</header>
	);
};

const AdminLayout = (workspace: Workspace) => (
	<div className="min-h-svh bg-sidebar lg:grid lg:h-dvh lg:grid-cols-[15rem_minmax(0,1fr)] print:block print:h-auto print:min-h-0 print:bg-background">
		<a
			href="#main-content"
			className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:m-2 focus:rounded-md focus:bg-card focus:p-3"
		>
			Skip to content
		</a>
		<aside className="hidden min-h-0 overflow-y-auto bg-sidebar text-sidebar-foreground lg:flex lg:flex-col print:hidden">
			<Sidebar {...workspace} />
		</aside>
		<div className="min-h-svh min-w-0 border-2 bg-background lg:my-2 lg:mr-2 lg:flex lg:min-h-0 lg:flex-col lg:overflow-hidden lg:rounded-xl lg:shadow-xs lg:ring-1 lg:ring-foreground/10 print:m-0 print:block print:min-h-0 print:overflow-visible print:border-0 print:shadow-none print:ring-0">
			<TopBar {...workspace} />
			<div
				data-scroll-restoration-id="workspace"
				className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto print:overflow-visible"
			>
				<main
					id="main-content"
					tabIndex={-1}
					className="@container/main mx-auto flex w-full max-w-350 flex-col gap-4 px-4 py-5 outline-none lg:gap-6 lg:px-6 lg:py-6 print:max-w-none print:p-0"
				>
					<Outlet />
				</main>
			</div>
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
