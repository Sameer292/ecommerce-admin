import { createServerFn } from "@tanstack/react-start";
import { getStoreSettings } from "@/features/settings/settings.server";
import { getStaff, requireStaff } from "./session.server";

export const readStaff = createServerFn().handler(() => getStaff());

export const readWorkspace = createServerFn().handler(async () => {
	const staff = await requireStaff();
	return { staff, store: await getStoreSettings() };
});
