import { db } from "@/db/client.server";
import { storeCurrency } from "@/db/schema/settings";
import { currencySchema } from "./store-validation";

export const getStoreCurrency = async () => {
	const [store] = await db.select({ currency: storeCurrency.currency }).from(storeCurrency);
	if (!store) throw new Error("Store currency is unset. Run bun run db:lock-currency.");
	return store.currency;
};

export const lockStoreCurrency = async (value: unknown) => {
	const currency = currencySchema.parse(value);
	await db.insert(storeCurrency).values({ currency }).onConflictDoNothing();
	const stored = await getStoreCurrency();
	if (stored !== currency) throw new Error(`Store currency is already locked to ${stored}.`);
	return stored;
};
