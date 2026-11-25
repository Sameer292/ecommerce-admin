import { enum as ZEnum, object as ZObject, string as ZString } from "zod";
import { pageSearchSchema } from "@/lib/pagination";
import { sortSchema } from "@/lib/sort";
import { staffEmailSchema, staffPasswordSchema } from "@/features/auth/auth-validation";
import { roles } from "@/features/auth/permissions";

export const staffIdSchema = ZObject({ id: ZString().min(1).max(128) });

export const staffAccountSchema = ZObject({
	name: ZString().trim().min(1, "Enter a name.").max(80),
	email: staffEmailSchema,
	password: staffPasswordSchema,
	role: ZEnum(roles),
});

export const editStaffSchema = staffIdSchema.extend({
	role: ZEnum(roles),
	status: ZEnum(["active", "disabled"]),
});

export const teamSearchSchema = pageSearchSchema.extend({ sort: sortSchema("name", "email") });
