import type { StoreSettingsValues } from "./settings.types";
import { eq } from "drizzle-orm";
import { db } from "@/db/client.server";
import { storeSettings } from "@/db/schema/settings";
import { env } from "@/server/env.server";
import { ActionError } from "@/server/mutation.server";
import { getStoreCurrency } from "./store-currency.server";

export const getStoreSettings = async () => {
	const [[settings], currency] = await Promise.all([
		db.select().from(storeSettings).where(eq(storeSettings.id, 1)),
		getStoreCurrency(),
	]);
	return {
		name: settings?.name ?? env.STORE_NAME,
		contactEmail: settings?.contactEmail ?? "",
		timeZone: settings?.timeZone ?? env.STORE_TIME_ZONE,
		currency,
		version: settings?.version ?? 0,
	};
};

export const saveStoreSettings = async ({ version, ...values }: StoreSettingsValues) => {
	const next = { ...values, version: version + 1 };
	const where = eq(storeSettings.version, version);
	const [updated] =
		version === 0
			? await db
					.insert(storeSettings)
					.values(next)
					.onConflictDoUpdate({ target: storeSettings.id, set: next, setWhere: where })
					.returning({ id: storeSettings.id })
			: await db.update(storeSettings).set(next).where(where).returning({ id: storeSettings.id });
	if (!updated) throw new ActionError("Store settings changed. Refresh before saving.");
};
