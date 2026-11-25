import { connection } from "../src/db/client.server";
import { createStaffAccount } from "../src/features/team/provision-staff.server";
import { env } from "../src/server/env.server";

const isLoopback = (value: string) => ["127.0.0.1", "localhost"].includes(new URL(value).hostname);
if (!isLoopback(env.SUPABASE_URL) || !isLoopback(env.DATABASE_URL)) {
	throw new Error("Browser fixtures require local Supabase and PostgreSQL.");
}

try {
	for (const [fixture, role, name] of [
		["ADMIN", "manager", "Browser manager"],
		["VIEWER", "viewer", "Browser viewer"],
		["OWNER", "superuser", "Browser owner"],
	] as const) {
		const email = process.env[`E2E_${fixture}_EMAIL`];
		const password = process.env[`E2E_${fixture}_PASSWORD`];
		if (fixture === "OWNER" && !email && !password) continue;
		if (!email || !password) throw new Error(`Set the E2E_${fixture} fixture credentials.`);
		await createStaffAccount({ email, password, role, name });
	}
} finally {
	await connection.end();
}
