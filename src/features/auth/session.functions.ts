import { createServerFn } from "@tanstack/react-start";
import { getStoreSettings } from "@/features/settings/settings.server";
import { getStaff, getStaffIdentity, requireStaff, withStaffMutation } from "./session.server";
import { listStaffSessions } from "./staff-sessions.server";
import { getSupabaseAuth } from "./supabase.server";

export const readSignInStep = createServerFn().handler(async () => {
	const identity = await getStaffIdentity();
	if (!identity) return "signin";
	if (identity.passwordGrant && (identity.assured || !identity.hasFactor)) return "password";
	if (identity.staff.passwordPending && !identity.passwordGrant) return "password";
	return identity.assured ? "ready" : "mfa";
});

export const readWorkspace = createServerFn().handler(async () => {
	const staff = await getStaff();
	return staff ? { staff, store: await getStoreSettings() } : null;
});

export const readStaffSessions = createServerFn().handler(async () => {
	const staff = await requireStaff();
	const identity = await getStaffIdentity();
	return identity ? listStaffSessions(identity.authUserId, identity.sessionId, staff.id) : [];
});

export const revokeOtherStaffSessions = createServerFn({ method: "POST" }).handler(() =>
	withStaffMutation("read", async () => {
		const { error } = await getSupabaseAuth().signOut({ scope: "others" });
		return error
			? { success: false, error: "Couldn’t sign out other devices. Try again." }
			: { success: true };
	}),
);
