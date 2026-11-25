import { z } from "zod";
import { pageSearchSchema } from "@/lib/pagination";
import { sortSchema } from "@/lib/sort";
import { staffEmailSchema, staffPasswordSchema } from "@/features/auth/auth-validation";
import { roles } from "@/features/auth/permissions";

export const staffIdSchema = z.object({ id: z.string().min(1).max(128) });

export const staffAccountSchema = z.object({
	name: z.string().trim().min(1, "Enter a name.").max(80),
	email: staffEmailSchema,
	password: staffPasswordSchema,
	role: z.enum(roles),
});

export const editStaffSchema = staffIdSchema.extend({
	role: z.enum(roles),
	status: z.enum(["active", "disabled"]),
});

export const teamSearchSchema = pageSearchSchema.extend({ sort: sortSchema("name", "email") });
