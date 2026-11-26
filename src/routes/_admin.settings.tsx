import { createFileRoute } from "@tanstack/react-router";
import { PageHeading } from "@/components/admin/page-heading";
import { can } from "@/features/auth/permissions";
import { readStaffSessions } from "@/features/auth/session.functions";
import { PasswordForm } from "@/features/settings/password-form";
import { StoreSettingsForm } from "@/features/settings/settings-form";
import { SessionManagement } from "@/features/settings/session-management";

const SettingsPage = () => {
	const { store, staff } = Route.useRouteContext();
	const sessions = Route.useLoaderData();
	return (
		<>
			<PageHeading
				title="Settings"
				description="Manage store reporting preferences and your staff account."
			/>
			<div className="grid items-start gap-4 lg:grid-cols-2">
				<StoreSettingsForm store={store} editable={can(staff.role, "manageSettings")} />
				<PasswordForm email={staff.email} />
				<SessionManagement sessions={sessions} zone={store.timeZone} />
			</div>
		</>
	);
};

export const Route = createFileRoute("/_admin/settings")({
	loader: () => readStaffSessions(),
	component: SettingsPage,
});
