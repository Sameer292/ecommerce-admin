import { createServerFn } from "@tanstack/react-start";
import { getStoreSettings } from "@/features/settings/settings.server";
import { getStaff, getStaffIdentity } from "./session.server";

export const readSignInStep = createServerFn().handler(async () => {
	const identity = await getStaffIdentity();
	return !identity ? "signin" : identity.assured ? "ready" : "mfa";
});

export const readWorkspace = createServerFn().handler(async () => {
	const staff = await getStaff();
	return staff ? { staff, store: await getStoreSettings() } : null;
});
