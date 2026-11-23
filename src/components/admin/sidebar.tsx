import { Link } from "@tanstack/react-router";
import type { readWorkspace } from "@/features/auth/session.functions";
import { roleLabels } from "@/features/auth/permissions";
import { Navigation } from "./navigation";
import { SignOut } from "./sign-out";
import { StoreMark } from "./store-mark";

type Workspace = Awaited<ReturnType<typeof readWorkspace>>;

const StoreIdentity = ({
	name,
	onNavigate,
}: {
	name: string;
	onNavigate?: () => void;
}) => (
	<Link
		to="/"
		onClick={onNavigate}
		className="flex min-w-0 items-center gap-3 px-5 py-5"
	>
		<StoreMark />
		<span className="flex min-w-0 flex-col">
			<span className="truncate font-heading font-semibold tracking-tight">
				{name}
			</span>
			<span className="text-xs text-muted-foreground">Store admin</span>
		</span>
	</Link>
);

const StaffProfile = ({ staff }: Pick<Workspace, "staff">) => (
	<div className="flex items-center gap-3 border-t border-sidebar-border p-4">
		<span
			aria-hidden
			className="grid size-9 shrink-0 place-items-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground"
		>
			{staff.name.slice(0, 1).toLocaleUpperCase()}
		</span>
		<div className="flex min-w-0 flex-1 flex-col">
			<span className="truncate text-sm font-medium">{staff.name}</span>
			<span className="text-xs text-muted-foreground">
				{roleLabels[staff.role]}
			</span>
		</div>
		<SignOut />
	</div>
);

export const Sidebar = ({
	staff,
	store,
	onNavigate,
}: Workspace & { onNavigate?: () => void }) => (
	<>
		<StoreIdentity name={store.name} onNavigate={onNavigate} />
		<Navigation role={staff.role} onNavigate={onNavigate} />
		<StaffProfile staff={staff} />
	</>
);
