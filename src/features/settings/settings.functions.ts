import { createServerFn } from "@tanstack/react-start";
import { requireStaff } from "@/features/auth/session.server";
import { formDataSchema } from "@/lib/validation";
import { mutate } from "@/server/mutation.server";
import { saveStoreSettings } from "./settings.server";
import { storeSettingsSchema } from "./store-validation";

export const writeStoreSettings = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(async ({ data }) => {
		await requireStaff("manageSettings");
		return mutate(storeSettingsSchema, data, saveStoreSettings);
	});
