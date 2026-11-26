import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AdminForm } from "@/components/admin/admin-form";
import { FormSection } from "@/components/admin/form-section";
import { formatDateTime } from "@/lib/format";
import {
	revokeOtherStaffSessions,
	type readStaffSessions,
} from "@/features/auth/session.functions";

export const SessionManagement = ({
	sessions,
	zone,
}: {
	sessions: Awaited<ReturnType<typeof readStaffSessions>>;
	zone: string;
}) => {
	const revoke = useServerFn(revokeOtherStaffSessions);
	const router = useRouter();
	return (
		<FormSection
			title="Active sessions"
			description="Review your browsers and sign out other devices."
		>
			<ul className="divide-y text-sm">
				{sessions.map((session) => (
					<li key={session.id} className="space-y-1 py-2">
						<p className="font-medium">{session.current ? "This session" : "Other session"}</p>
						<p className="wrap-anywhere">{session.device || "Browser details unavailable"}</p>
						<p className="text-muted-foreground">
							Last active {formatDateTime(session.lastActive, zone)} · {zone}
						</p>
					</li>
				))}
			</ul>
			{sessions.some((session) => !session.current) && (
				<AdminForm
					onSave={() => revoke()}
					onSuccess={() => router.invalidate()}
					submitLabel="Sign out other devices"
					successMessage="Other devices signed out."
				>
					{null}
				</AdminForm>
			)}
		</FormSection>
	);
};
