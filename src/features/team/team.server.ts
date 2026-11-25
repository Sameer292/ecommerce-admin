import { and, eq, ilike, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db/client.server";
import { alphabetical, orderBySort } from "@/db/sort.server";
import { user } from "@/db/schema/auth";
import { isRole, roles } from "@/features/auth/permissions";
import { pageOffset, pageSize, searchPattern } from "@/lib/pagination";
import { ActionError } from "@/server/mutation.server";
import type { EditStaffValues, StaffAccount, StaffSearch } from "./team.types";

const columns = {
	id: user.id,
	name: user.name,
	email: user.email,
	role: user.role,
	banned: user.banned,
	authUserId: user.authUserId,
	createdAt: user.createdAt,
};

const staffAccount = ({
	role,
	authUserId,
	...staff
}: Omit<StaffAccount, "role" | "linked"> & {
	role: string;
	authUserId: string | null;
}): StaffAccount => {
	if (!isRole(role)) throw new ActionError("This account has an invalid role.");
	return { ...staff, role, linked: authUserId !== null };
};

const searchColumns = { name: alphabetical(user.name), email: alphabetical(user.email) };

export const listTeam = async ({ q, page, sort }: StaffSearch) => {
	const pattern = searchPattern(q);
	const where = and(
		inArray(user.role, roles),
		q ? or(ilike(user.name, pattern), ilike(user.email, pattern)) : undefined,
	);
	const [rows, total] = await Promise.all([
		db
			.select(columns)
			.from(user)
			.where(where)
			.orderBy(...orderBySort(searchColumns, sort ?? "name.asc", user.id))
			.limit(pageSize)
			.offset(pageOffset(page)),
		db.$count(user, where),
	]);
	return { rows: rows.map(staffAccount), total };
};

export const findStaffAccount = async (id: string) => {
	const [row] = await db.select(columns).from(user).where(eq(user.id, id));
	return row && staffAccount(row);
};

export const editStaffAccount = ({ id, role, status }: EditStaffValues, actorId: string) =>
	db.transaction(
		async (transaction) => {
			// Serialize staff writes so simultaneous edits cannot revoke every owner.
			await transaction.execute(sql`lock table ${user} in share row exclusive mode`);
			const owners = await transaction
				.select({ id: user.id })
				.from(user)
				.where(
					and(
						eq(user.role, "superuser"),
						isNotNull(user.authUserId),
						or(eq(user.banned, false), isNull(user.banned)),
					),
				);
			if (!owners.some((owner) => owner.id === actorId))
				throw new ActionError("Your account no longer has permission to manage staff.");
			const banned = status === "disabled";
			if ((banned || role !== "superuser") && !owners.some((owner) => owner.id !== id))
				throw new ActionError("At least one active superuser must remain.");

			const [updated] = await transaction
				.update(user)
				.set({ role, banned, updatedAt: new Date() })
				.where(
					and(eq(user.id, id), inArray(user.role, role === "superuser" ? ["superuser"] : roles)),
				)
				.returning({ id: user.id });
			if (!updated) throw new ActionError("This account can’t be changed here.");
		},
		{ isolationLevel: "read committed" },
	);
