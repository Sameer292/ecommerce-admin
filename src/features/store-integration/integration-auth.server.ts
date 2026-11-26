import { createHash, timingSafeEqual } from "node:crypto";
import { and, arrayContains, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db/client.server";
import { integrationKeys } from "@/db/schema/integration-keys";
import { env } from "@/server/env.server";
import { logRequestFailure } from "@/server/request-diagnostics.server";
import { integrationScopes, type IntegrationScope } from "./integration-scopes";

export const sha256 = (value: string) => createHash("sha256").update(value).digest();

const unauthorized = () => Response.json({ error: "Unauthorized" }, { status: 401 });
const minute = sql`date_trunc('minute', now())`;
const requestsPerMinute = 120;

export const checkIntegrationToken = async (request: Request, scope: IntegrationScope) => {
	const match = /^Bearer ([A-Za-z0-9._-]{32,128})$/i.exec(
		request.headers.get("authorization") ?? "",
	);
	if (!match) return unauthorized();
	const hash = sha256(match[1]);
	const digest = hash.toString("hex");
	const legacy = Boolean(
		env.STORE_INTEGRATION_TOKEN && timingSafeEqual(sha256(env.STORE_INTEGRATION_TOKEN), hash),
	);
	try {
		if (legacy)
			await db
				.insert(integrationKeys)
				.values({ name: "Environment token", digest, scopes: [...integrationScopes], legacy })
				.onConflictDoNothing();
		const credential = and(
			eq(integrationKeys.digest, digest),
			eq(integrationKeys.legacy, legacy),
			isNull(integrationKeys.revokedAt),
		);
		const newMinute = sql`${integrationKeys.windowStart} IS DISTINCT FROM ${minute}`;
		const [allowed] = await db
			.update(integrationKeys)
			.set({
				lastUsedAt: sql`now()`,
				requestCount: sql`${integrationKeys.requestCount} + 1`,
				windowStart: minute,
				windowCount: sql`CASE WHEN ${newMinute} THEN 1 ELSE ${integrationKeys.windowCount} + 1 END`,
			})
			.where(
				and(
					credential,
					arrayContains(integrationKeys.scopes, [scope]),
					or(newMinute, lt(integrationKeys.windowCount, requestsPerMinute)),
				),
			)
			.returning({ id: integrationKeys.id });
		if (allowed) return;
		const [key] = await db
			.select({ scopes: integrationKeys.scopes })
			.from(integrationKeys)
			.where(credential);
		if (!key) return unauthorized();
		if (!key.scopes.includes(scope))
			return Response.json({ error: "This key lacks the required scope." }, { status: 403 });
		return Response.json(
			{ error: "Rate limit exceeded. Retry in one minute." },
			{ status: 429, headers: { "Retry-After": "60" } },
		);
	} catch (error) {
		const requestId = logRequestFailure("authorize storefront credential", error);
		return Response.json(
			{ error: "Integration credentials are temporarily unavailable.", requestId },
			{ status: 503 },
		);
	}
};
