import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { requireStaff, withStaffMutation } from "@/features/auth/session.server";
import { formDataSchema } from "@/lib/validation";
import { mutate } from "@/server/mutation.server";
import {
	editStaffSchema,
	inviteStaffSchema,
	staffIdSchema,
	teamSearchSchema,
	transferOwnershipSchema,
} from "./team-validation";
import { inviteStaffAccount } from "./provision-staff.server";
import { editStaffAccount, findStaffAccount, listTeam, transferOwnership } from "./team.server";

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
	.handler(({ data }) =>
		withStaffMutation("manageTeam", (staff) =>
			mutate(inviteStaffSchema, data, (values) => inviteStaffAccount(values, staff.id)),
		),
	);

export const writeStaffAccount = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(({ data }) =>
		withStaffMutation("manageTeam", (staff) =>
			mutate(editStaffSchema, data, (values) => editStaffAccount(values, staff.id)),
		),
	);

export const transferStaffOwnership = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(({ data }) =>
		withStaffMutation("manageTeam", (staff) =>
			mutate(transferOwnershipSchema, data, ({ id, version }) =>
				transferOwnership(id, version, staff.id),
			),
		),
	);
