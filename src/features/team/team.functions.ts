import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { requireStaff } from "@/features/auth/session.server";
import { formDataSchema } from "@/lib/validation";
import { mutate } from "@/server/mutation.server";
import {
	editStaffSchema,
	staffAccountSchema,
	staffIdSchema,
	teamSearchSchema,
} from "./team-validation";
import { createStaffAccount, editStaffAccount, findStaffAccount, listTeam } from "./team.server";

export const readTeam = createServerFn()
	.validator(teamSearchSchema)
	.handler(async ({ data }) => {
		await requireStaff("manageTeam");
		return listTeam(data);
	});

export const readStaffAccount = createServerFn()
	.validator(staffIdSchema)
	.handler(async ({ data }) => {
		await requireStaff("manageTeam");
		const account = await findStaffAccount(data.id);
		if (!account) throw notFound();
		return account;
	});

export const addStaffAccount = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(async ({ data }) => {
		await requireStaff("manageTeam");
		return mutate(staffAccountSchema, data, createStaffAccount);
	});

export const writeStaffAccount = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(async ({ data }) => {
		await requireStaff("manageTeam");
		return mutate(editStaffSchema, data, editStaffAccount);
	});
