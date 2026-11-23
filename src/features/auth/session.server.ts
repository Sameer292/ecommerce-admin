import { redirect } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import type { Permission } from "./auth.types";
import { auth } from "./auth.server";
import { can, isRole } from "./permissions";

export const getStaff = async () => {
	const session = await auth.api.getSession({ headers: getRequestHeaders() });
	const staff = session?.user;
	if (!staff || staff.banned || !isRole(staff.role)) return null;
	return {
		id: staff.id,
		email: staff.email,
		name: staff.name,
		role: staff.role,
	};
};

export const requireStaff = async (permission: Permission = "read") => {
	const staff = await getStaff();
	if (!staff) throw redirect({ to: "/login" });
	if (!can(staff.role, permission)) throw new Error("You don’t have permission to do that.");
	return staff;
};
