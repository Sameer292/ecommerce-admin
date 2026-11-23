import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";
import { db } from "@/db/client.server";
import * as schema from "@/db/schema/auth";
import { env } from "@/server/env.server";

const clientIpHeader = env.AUTH_CLIENT_IP_HEADER;

export const auth = betterAuth({
	baseURL: env.BETTER_AUTH_URL,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: "pg", schema, transaction: true }),
	emailAndPassword: {
		enabled: true,
		disableSignUp: true,
		minPasswordLength: 12,
	},
	session: { expiresIn: 60 * 60 * 24, updateAge: 60 * 60 * 4 },
	rateLimit: {
		enabled: true,
		storage: "database",
		customRules: { "/sign-in/email": { window: 60, max: 10 } },
	},
	advanced: {
		ipAddress: { ipAddressHeaders: clientIpHeader ? [clientIpHeader] : [] },
	},
	plugins: [
		admin({
			adminRoles: ["superuser"],
			defaultRole: "viewer",
			roles: { superuser: adminAc, manager: userAc, viewer: userAc },
		}),
	],
});
