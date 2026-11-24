import { z } from "zod";
import { pageSearchSchema } from "@/lib/pagination";
import { sortSchema } from "@/lib/sort";
import { roles } from "@/features/auth/permissions";

export const staffIdSchema = z.object({ id: z.string().min(1).max(128) });

export const staffAccountSchema = z.object({
	name: z.string().trim().min(1, "Enter a name.").max(80),
	email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
	password: z.string().min(12, "Use at least 12 characters for the password.").max(128),
	role: z.enum(roles),
});

export const editStaffSchema = staffIdSchema.extend({
	role: z.enum(["manager", "viewer"]),
	status: z.enum(["active", "disabled"]),
});

export const teamSearchSchema = pageSearchSchema.extend({ sort: sortSchema("name", "email") });
