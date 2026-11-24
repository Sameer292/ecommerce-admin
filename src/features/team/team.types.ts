import type { z } from "zod";
import type { user } from "@/db/schema/auth";
import type { Role } from "@/features/auth/auth.types";
import type { editStaffSchema, staffAccountSchema, teamSearchSchema } from "./team-validation";

export type StaffAccount = Pick<
	typeof user.$inferSelect,
	"id" | "name" | "email" | "banned" | "createdAt"
> & { role: Role; linked: boolean };
export type StaffSearch = z.output<typeof teamSearchSchema>;
export type StaffValues = z.output<typeof staffAccountSchema>;
export type EditStaffValues = z.output<typeof editStaffSchema>;
