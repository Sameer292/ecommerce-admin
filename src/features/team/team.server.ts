import { and, eq, ilike, inArray, or } from "drizzle-orm";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { db } from "@/db/client.server";
import { alphabetical, orderBySort } from "@/db/sort.server";
import { session, user } from "@/db/schema/auth";
import { auth } from "@/features/auth/auth.server";
import { isRole, roles } from "@/features/auth/permissions";
import { pageOffset, pageSize, searchPattern } from "@/lib/pagination";
import { ActionError } from "@/server/mutation.server";
import type { EditStaffValues, StaffAccount, StaffSearch, StaffValues } from "./team.types";

const columns = {
	id: user.id,
	name: user.name,
	email: user.email,
	role: user.role,
	banned: user.banned,
	createdAt: user.createdAt,
};

const staffAccount = ({
	role,
	...staff
}: Omit<StaffAccount, "role"> & { role: string }): StaffAccount => {
	if (!isRole(role)) throw new ActionError("This account has an invalid role.");
	return { ...staff, role };
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

export const createStaffAccount = async (body: StaffValues) => {
	try {
		await auth.api.createUser({ headers: getRequestHeaders(), body });
	} catch (error) {
		if (error instanceof Error && "statusCode" in error && error.statusCode === 422) {
			throw new ActionError("This email is already in use or the account details are invalid.");
		}
		throw error;
	}
};

export const editStaffAccount = ({ id, role, status }: EditStaffValues) =>
	db.transaction(async (transaction) => {
		const banned = status === "disabled";
		const [updated] = await transaction
			.update(user)
			.set({
				role,
				banned,
				banReason: banned ? "Disabled by a superuser" : null,
				banExpires: null,
				updatedAt: new Date(),
			})
			.where(and(eq(user.id, id), inArray(user.role, ["manager", "viewer"])))
			.returning({ id: user.id });
		if (!updated) throw new ActionError("This account can’t be changed here.");
		if (banned) await transaction.delete(session).where(eq(session.userId, id));
	});
