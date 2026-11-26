import { count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/client.server";
import { auditEvents } from "@/db/schema/audit";
import { user } from "@/db/schema/auth";
import { pageOffset, pageSize, searchPattern, type ListPageSize } from "@/lib/pagination";

export const listAudit = async ({
	page,
	q,
	perPage,
}: {
	page: number;
	q: string;
	perPage?: ListPageSize;
}) => {
	const pattern = searchPattern(q);
	const actor = sql<string>`coalesce(${user.name}, ${auditEvents.actorId}, 'System')`;
	const staff = eq(user.id, auditEvents.actorId);
	const where = q
		? or(
				ilike(auditEvents.recordLabel, pattern),
				ilike(auditEvents.recordId, pattern),
				ilike(auditEvents.subject, pattern),
				ilike(sql`replace(array_to_string(${auditEvents.fields}, ' '), '_', ' ')`, pattern),
				ilike(actor, pattern),
			)
		: undefined;
	const [rows, [summary]] = await Promise.all([
		db
			.select({
				id: auditEvents.id,
				actor,
				subject: auditEvents.subject,
				recordId: auditEvents.recordId,
				recordLabel: auditEvents.recordLabel,
				action: auditEvents.action,
				fields: auditEvents.fields,
				createdAt: auditEvents.createdAt,
			})
			.from(auditEvents)
			.leftJoin(user, staff)
			.where(where)
			.limit(perPage ?? pageSize)
			.offset(pageOffset(page, perPage))
			.orderBy(desc(auditEvents.createdAt), desc(auditEvents.id)),
		db.select({ total: count() }).from(auditEvents).leftJoin(user, staff).where(where),
	]);
	return { rows, total: summary.total };
};
