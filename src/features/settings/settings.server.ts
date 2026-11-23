import type { StoreSettingsValues } from "./settings.types";
import { eq } from "drizzle-orm";
import { db } from "@/db/client.server";
import { storeSettings } from "@/db/schema/settings";
import { env } from "@/server/env.server";

export const getStoreSettings = async () => {
	const [settings] = await db.select().from(storeSettings).where(eq(storeSettings.id, 1));
	return {
		name: settings?.name ?? env.STORE_NAME,
		contactEmail: settings?.contactEmail ?? "",
		timeZone: settings?.timeZone ?? env.STORE_TIME_ZONE,
		currency: env.STORE_CURRENCY,
	};
};

export const saveStoreSettings = (values: StoreSettingsValues) =>
	db
		.insert(storeSettings)
		.values({ id: 1, ...values })
		.onConflictDoUpdate({ target: storeSettings.id, set: values });
