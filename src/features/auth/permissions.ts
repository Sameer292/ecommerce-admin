export const roles = ["superuser", "manager", "viewer"] as const;

export const roleLabels = {
	superuser: "Superuser",
	manager: "Manager",
	viewer: "Viewer",
} as const;

export const roleDescriptions = {
	superuser: "Full access, including team accounts and store settings.",
	manager: "Manage catalog, inventory, orders, and customers.",
	viewer: "Read-only access to store data and settings.",
} as const;

export const isRole = (value: unknown): value is Role =>
	roles.some((role) => role === value);

export const can = (role: Role, permission: Permission) =>
	permission === "read" ||
	role === "superuser" ||
	(role === "manager" && permission === "manageCommerce");

import type { Permission, Role } from "./auth.types";
