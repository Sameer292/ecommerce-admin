import { connection } from "../src/db/client.server";
import { lockStoreCurrency } from "../src/features/settings/store-currency.server";

try {
	const currency = await lockStoreCurrency(process.env.STORE_CURRENCY);
	console.log(`Store currency is locked to ${currency}.`);
} finally {
	await connection.end();
}
