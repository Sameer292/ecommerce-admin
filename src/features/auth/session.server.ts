import { redirect } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client.server";
import { user } from "@/db/schema/auth";
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
		})
		.from(user)
		.where(eq(user.authUserId, authUserId));
	if (!staff || staff.banned || !isRole(staff.role)) return null;
	const { id, email, name, role } = staff;
	return { id, email, name, role };
};

const fetchStaff = async () => {
	const auth = getSupabaseAuth();
	const { data, error } = await auth.getUser();
	if (error || !data.user) return null;
	const staff = await findActiveStaff(data.user.id);
	if (!staff) await auth.signOut({ scope: "local" });
	return staff;
};

const requestStaff = new WeakMap<Request, ReturnType<typeof fetchStaff>>();

export const getStaff = () => {
	const request = getRequest();
	const cached = requestStaff.get(request);
	if (cached) return cached;
	const staff = fetchStaff();
	requestStaff.set(request, staff);
	return staff;
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
