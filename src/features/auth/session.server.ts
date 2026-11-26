import { redirect } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client.server";
import { staffPasswordGrants, user } from "@/db/schema/auth";
import type { MutationResult } from "@/server/mutation.types";
import type { Permission } from "./auth.types";
import { can, isRole } from "./permissions";
import { loginReturn } from "./login-return";
import { getSupabaseAuth } from "./supabase.server";

export const findActiveStaff = async (authUserId: string) => {
	const [staff] = await db
		.select({
			id: user.id,
			email: user.email,
			name: user.name,
			role: user.role,
			banned: user.banned,
			passwordPending: user.passwordPending,
		})
		.from(user)
		.where(eq(user.authUserId, authUserId));
	if (!staff || staff.banned || !isRole(staff.role)) return null;
	const { id, email, name, role, passwordPending } = staff;
	return { id, email, name, role, passwordPending };
};

const fetchStaffIdentity = async () => {
	const auth = getSupabaseAuth();
	const { data, error } = await auth.getUser();
	if (error || !data.user) return null;
	const staff = await findActiveStaff(data.user.id);
	if (!staff) {
		await auth.signOut({ scope: "local" });
		return null;
	}
	const hasFactor = Boolean(data.user.factors?.some((factor) => factor.status === "verified"));
	const requireMfa = staff.role === "superuser" || hasFactor;
	const result = await auth.getClaims();
	const claims = result.data?.claims;
	const sessionId = claims?.session_id;
	if (!claims || typeof sessionId !== "string" || claims.sub !== data.user.id) return null;
	const assured = !requireMfa || claims.aal === "aal2";
	const [grant] = await db
		.select({ expiresAt: staffPasswordGrants.expiresAt })
		.from(staffPasswordGrants)
		.where(
			and(eq(staffPasswordGrants.sessionId, sessionId), eq(staffPasswordGrants.staffId, staff.id)),
		);
	return { staff, assured, hasFactor, sessionId, passwordGrant: grant?.expiresAt };
};

const requestStaff = new WeakMap<Request, ReturnType<typeof fetchStaffIdentity>>();

export const getStaffIdentity = () => {
	const request = getRequest();
	const cached = requestStaff.get(request);
	if (cached) return cached;
	const staff = fetchStaffIdentity();
	requestStaff.set(request, staff);
	return staff;
};

export const getStaff = async () => {
	const identity = await getStaffIdentity();
	if (!identity?.assured || identity.passwordGrant || identity.staff.passwordPending) return null;
	const { id, email, name, role } = identity.staff;
	return { id, email, name, role };
};

export const requireStaff = async (permission: Permission = "read") => {
	const staff = await getStaff();
	if (!staff) {
		const referrer = getRequest().headers.get("referer") ?? "";
		const referer = URL.canParse(referrer) ? new URL(referrer) : undefined;
		const returnTo = referer ? loginReturn(referer.pathname + referer.search) : undefined;
		throw redirect({ to: "/login", search: { returnTo } });
	}
	if (!can(staff.role, permission)) throw new Response("Forbidden", { status: 403 });
	return staff;
};

export const withStaffMutation = async (
	permission: Permission,
	action: (staff: NonNullable<Awaited<ReturnType<typeof getStaff>>>) => Promise<MutationResult>,
): Promise<MutationResult> => {
	const staff = await getStaff();
	if (!staff)
		return {
			success: false,
			error: "Your session expired. Sign in and try saving again.",
			reauthenticate: true,
		};
	if (!can(staff.role, permission))
		return {
			success: false,
			error: "Your staff role does not have permission to make this change.",
		};
	return action(staff);
};
