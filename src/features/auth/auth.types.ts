import type { roles } from "./permissions";

export type Role = (typeof roles)[number];
export type Permission = "read" | "manageCommerce" | "manageTeam" | "manageSettings";
