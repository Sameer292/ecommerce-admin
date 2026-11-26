import { sql } from "drizzle-orm";
import { db } from "@/db/client.server";
import { staffPasswordGrants, user } from "@/db/schema/auth";

const activeSessions = (authUserId: string, validAfter: Date | null) => sql`
	FROM auth.sessions AS session
	WHERE session.user_id = ${authUserId}::uuid
		AND (session.not_after IS NULL OR session.not_after > now())
		AND (${validAfter?.toISOString() ?? null}::timestamptz IS NULL OR session.created_at > ${validAfter?.toISOString() ?? null}::timestamptz)
`;

export const readLiveStaffSession = async (
	authUserId: string,
	sessionId: string,
	staffId: string,
	validAfter: Date | null,
) => {
	const [result] = await db.execute<{ expiresAt: string | null }>(sql`
		SELECT (SELECT expires_at FROM ${staffPasswordGrants}
			WHERE session_id = ${sessionId}::uuid AND staff_id = ${staffId}) AS "expiresAt"
		${activeSessions(authUserId, validAfter)} AND session.id = ${sessionId}::uuid
	`);
	return result && { expiresAt: result.expiresAt ? new Date(result.expiresAt) : null };
};

export const listStaffSessions = async (authUserId: string, sessionId: string, staffId: string) => {
	const rows = await db.execute<{
		id: string;
		current: boolean;
		device: string | null;
		lastActive: string;
	}>(sql`
		SELECT session.id, session.id = ${sessionId}::uuid AS current, left(session.user_agent, 160) AS device,
			coalesce(session.refreshed_at AT TIME ZONE 'UTC', session.created_at) AS "lastActive"
		${activeSessions(authUserId, null)}
		AND session.created_at > coalesce((SELECT ${user.sessionsValidAfter} FROM ${user} WHERE ${user.id} = ${staffId}), '-infinity'::timestamptz)
		ORDER BY current DESC, "lastActive" DESC
	`);
	return rows.map((row) => ({ ...row, lastActive: new Date(row.lastActive) }));
};
