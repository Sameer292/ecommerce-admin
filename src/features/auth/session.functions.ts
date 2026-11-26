import { createServerFn } from "@tanstack/react-start";
import { getStoreSettings } from "@/features/settings/settings.server";
import { getStaff } from "./session.server";

export const readStaff = createServerFn().handler(() => getStaff());

export const readWorkspace = createServerFn().handler(async () => {
	const staff = await getStaff();
	return staff ? { staff, store: await getStoreSettings() } : null;
});
