import type { output as ZOutput } from "zod";
import type { user } from "@/db/schema/auth";
import type { Role } from "@/features/auth/auth.types";
import type { editStaffSchema, staffAccountSchema, teamSearchSchema } from "./team-validation";

export type StaffAccount = Pick<
	typeof user.$inferSelect,
	"id" | "name" | "email" | "banned" | "createdAt" | "version" | "passwordPending"
> & { role: Role; linked: boolean };
export type StaffSearch = ZOutput<typeof teamSearchSchema>;
export type StaffValues = ZOutput<typeof staffAccountSchema>;
export type EditStaffValues = ZOutput<typeof editStaffSchema>;
