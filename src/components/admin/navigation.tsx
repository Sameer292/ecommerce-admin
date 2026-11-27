import {
	BoxesIcon,
	DashboardSquare01Icon,
	Folder01Icon,
	File01Icon,
	Package01Icon,
	Settings01Icon,
	ShoppingBasket01Icon,
	UserMultipleIcon,
	UserSettings02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, type LinkProps } from "@tanstack/react-router";
import type { Role } from "@/features/auth/auth.types";
import { can } from "@/features/auth/permissions";

type NavigationItem = {
	to: LinkProps["to"];
	label: string;
	icon: typeof DashboardSquare01Icon;
	teamOnly?: boolean;
};

const groups: { name: string; items: NavigationItem[] }[] = [
	{
		name: "Workspace",
		items: [
			{ to: "/", label: "Dashboard", icon: DashboardSquare01Icon },
			{ to: "/orders", label: "Orders", icon: ShoppingBasket01Icon },
			{ to: "/customers", label: "Customers", icon: UserMultipleIcon },
		],
	},
	{
		name: "Catalog",
		items: [
			{ to: "/products", label: "Products", icon: Package01Icon },
			{ to: "/categories", label: "Categories", icon: Folder01Icon },
			{ to: "/inventory", label: "Inventory", icon: BoxesIcon },
		],
	},
	{
		name: "Administration",
		items: [
			{ to: "/team", label: "Team", icon: UserSettings02Icon, teamOnly: true },
			{ to: "/settings", label: "Settings", icon: Settings01Icon },
			{ to: "/audit", label: "Audit history", icon: File01Icon, teamOnly: true },
		],
	},
];

const standaloneTitles: Record<string, string> = {
	"/access-denied": "Access denied",
	"/integrations": "Integration credentials",
	"/product-import": "Catalog CSV",
};

export const navigationTitle = (pathname: string) => {
	const path = pathname.replace(/\/$/, "") || "/";
	for (const group of groups) {
		const item = group.items.find(
			({ to }) => path === to || (to !== "/" && path.startsWith(`${to}/`)),
		);
		if (item) return item.label;
	}
	return standaloneTitles[path] ?? "Page not found";
};

const NavigationLink = ({
	item,
	onNavigate,
}: {
	item: NavigationItem;
	onNavigate?: () => void;
}) => (
	<Link
		to={item.to}
		activeOptions={{ exact: item.to === "/", includeSearch: false }}
		preload={"intent"}
		onClick={onNavigate}
		className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[status=active]:bg-sidebar-accent data-[status=active]:font-semibold data-[status=active]:text-sidebar-accent-foreground"
	>
		<HugeiconsIcon icon={item.icon} className="size-4.5" aria-hidden />
		{item.label}
	</Link>
);

export const Navigation = ({ role, onNavigate }: { role: Role; onNavigate?: () => void }) => (
	<nav aria-label="Main navigation" className="flex flex-1 flex-col gap-6 px-3 py-5">
		{groups.map((group) => (
			<div key={group.name} className="flex flex-col gap-1">
				<p className="px-3 pb-1 text-xs font-medium text-muted-foreground">{group.name}</p>
				{group.items
					.filter((item) => !item.teamOnly || can(role, "manageTeam"))
					.map((item) => (
						<NavigationLink key={item.label} item={item} onNavigate={onNavigate} />
					))}
			</div>
		))}
	</nav>
);
