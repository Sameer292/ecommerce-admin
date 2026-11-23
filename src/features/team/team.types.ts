import type { z } from "zod";
import type { user } from "@/db/schema/auth";
import type { Role } from "@/features/auth/auth.types";
import type { pageSearchSchema } from "@/lib/pagination";
import type { editStaffSchema, staffAccountSchema } from "./team-validation";

export type StaffAccount = Pick<
	typeof user.$inferSelect,
	"id" | "name" | "email" | "banned" | "createdAt"
> & { role: Role };
export type StaffSearch = z.output<typeof pageSearchSchema>;
export type StaffValues = z.output<typeof staffAccountSchema>;
export type EditStaffValues = z.output<typeof editStaffSchema>;
