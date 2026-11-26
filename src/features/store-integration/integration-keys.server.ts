import { randomBytes } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client.server";
import { integrationKeys } from "@/db/schema/integration-keys";
import { sha256 } from "./integration-auth.server";
import type { IntegrationScope } from "./integration-scopes";

export const listIntegrationKeys = () =>
	db
		.select({
			id: integrationKeys.id,
			name: integrationKeys.name,
			scopes: integrationKeys.scopes,
			legacy: integrationKeys.legacy,
			revokedAt: integrationKeys.revokedAt,
			lastUsedAt: integrationKeys.lastUsedAt,
			requestCount: integrationKeys.requestCount,
		})
		.from(integrationKeys)
		.orderBy(desc(integrationKeys.createdAt), desc(integrationKeys.id));

export const issueIntegrationKey = async (
	name: string,
	scopes: IntegrationScope[],
	staffId: string,
) => {
	const token = randomBytes(32).toString("base64url");
	await db
		.insert(integrationKeys)
		.values({ name, scopes, digest: sha256(token).toString("hex"), createdBy: staffId });
	return token;
};

export const revokeIntegrationKey = async (id: string) => {
	await db
		.update(integrationKeys)
		.set({ revokedAt: sql`now()` })
		.where(
			and(
				eq(integrationKeys.id, id),
				eq(integrationKeys.legacy, false),
				isNull(integrationKeys.revokedAt),
			),
		);
};
