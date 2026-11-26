import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { array as ZArray, enum as ZEnum, object as ZObject, string as ZString } from "zod";
import { requireStaff, withStaffMutation } from "@/features/auth/session.server";
import { formDataSchema, idSchema } from "@/lib/validation";
import { mutate } from "@/server/mutation.server";
import {
	issueIntegrationKey,
	listIntegrationKeys,
	revokeIntegrationKey,
} from "./integration-keys.server";
import { integrationScopes } from "./integration-scopes";

const keyForm = ZObject({
	name: ZString().trim().min(1, "Name this credential.").max(80),
	scopes: ZString()
		.max(256)
		.transform((value) => {
			try {
				return JSON.parse(value) as unknown;
			} catch {
				return null;
			}
		})
		.pipe(
			ZArray(ZEnum(integrationScopes))
				.min(1, "Select at least one permission.")
				.max(integrationScopes.length),
		)
		.transform((scopes) => [...new Set(scopes)]),
});

export const readIntegrationKeys = createServerFn().handler(async () => {
	await requireStaff("manageTeam");
	return listIntegrationKeys();
});

export const createIntegrationKey = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(async ({ data }) => {
		setResponseHeader("Cache-Control", "no-store");
		let token: string | undefined;
		data.set("scopes", JSON.stringify(data.getAll("scope")));
		const result = await withStaffMutation("manageTeam", (staff) =>
			mutate(keyForm, data, async ({ name, scopes }) => {
				token = await issueIntegrationKey(name, scopes, staff.id);
			}),
		);
		return result.success && token ? { ...result, token } : result;
	});

export const removeIntegrationKey = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(({ data }) =>
		withStaffMutation("manageTeam", () =>
			mutate(idSchema, data, ({ id }) => revokeIntegrationKey(id)),
		),
	);
