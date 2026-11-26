import { and, eq, ilike, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { setAuditActor } from "@/db/audit-actor.server";
import { db } from "@/db/client.server";
import { alphabetical, orderBySort } from "@/db/sort.server";
import { user } from "@/db/schema/auth";
import { isRole, roles } from "@/features/auth/permissions";
import { supabaseAdmin } from "@/features/auth/supabase-admin.server";
import { pageOffset, pageSize, searchPattern } from "@/lib/pagination";
import { ActionError } from "@/server/mutation.server";
import { logRequestFailure } from "@/server/request-diagnostics.server";
import type { EditStaffValues, StaffAccount, StaffSearch } from "./team.types";

const columns = {
	id: user.id,
	name: user.name,
	email: user.email,
	role: user.role,
	banned: user.banned,
	passwordPending: user.passwordPending,
	version: user.version,
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

export const listTeam = async ({ q, page, sort, perPage }: StaffSearch) => {
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
			.limit(perPage ?? pageSize)
			.offset(pageOffset(page, perPage)),
		db.$count(user, where),
	]);
	return { rows: rows.map(staffAccount), total };
};

export const findStaffAccount = async (id: string) => {
	const [row] = await db.select(columns).from(user).where(eq(user.id, id));
	return row && staffAccount(row);
};

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const inOwnerTransaction = <Result>(
	actorId: string,
	operation: (transaction: Transaction, owners: string[]) => Promise<Result>,
) =>
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
						eq(user.passwordPending, false),
						or(eq(user.banned, false), isNull(user.banned)),
					),
				);
			if (!owners.some((owner) => owner.id === actorId))
				throw new ActionError("Your account no longer has permission to manage staff.");
			await setAuditActor(transaction, actorId);
			return operation(
				transaction,
				owners.map(({ id }) => id),
			);
		},
		{ isolationLevel: "read committed" },
	);

export const editStaffAccount = async (
	{ id, role, status, version, name, email }: EditStaffValues,
	actorId: string,
) => {
	let changedAuth: { authUserId: string; from: string } | undefined;
	try {
		return await inOwnerTransaction(actorId, async (transaction, owners) => {
			const banned = status === "disabled";
			if ((banned || role !== "superuser") && !owners.some((owner) => owner !== id))
				throw new ActionError("At least one active superuser must remain.");

			const [target] = await transaction
				.select({ version: user.version, email: user.email, authUserId: user.authUserId })
				.from(user)
				.where(
					and(eq(user.id, id), inArray(user.role, role === "superuser" ? ["superuser"] : roles)),
				);
			if (!target) throw new ActionError("This account can’t be changed here.");
			if (target.version !== version)
				throw new ActionError("This account changed. Refresh before saving.");
			const emailChanged = email !== undefined && email !== target.email;
			if (emailChanged) {
				const [duplicate] = await transaction
					.select({ id: user.id })
					.from(user)
					.where(eq(user.email, email));
				if (duplicate)
					throw new ActionError("This email already belongs to a staff account.", "email");
				if (target.authUserId) {
					const { error } = await supabaseAdmin.updateUserById(target.authUserId, {
						email,
						email_confirm: true,
					});
					if (error)
						throw new ActionError(
							"Couldn’t change the sign-in email. Check that it is available.",
							"email",
						);
					changedAuth = { authUserId: target.authUserId, from: target.email };
				}
			}
			await transaction
				.update(user)
				.set({
					role,
					banned,
					name,
					email,
					updatedAt: new Date(),
					version: version + 1,
					sessionsValidAfter: sql`CASE WHEN ${emailChanged} OR coalesce(${user.banned}, false) <> ${banned} THEN now() ELSE ${user.sessionsValidAfter} END`,
				})
				.where(eq(user.id, id));
		});
	} catch (cause) {
		if (changedAuth) {
			try {
				const [saved] = await db.select({ email: user.email }).from(user).where(eq(user.id, id));
				if (saved?.email === changedAuth.from) {
					const { error } = await supabaseAdmin.updateUserById(changedAuth.authUserId, {
						email: changedAuth.from,
						email_confirm: true,
					});
					if (error) logRequestFailure("restore staff sign-in email", error);
				}
			} catch (error) {
				logRequestFailure("restore staff sign-in email", error);
			}
		}
		throw cause;
	}
};

export const transferOwnership = (id: string, version: number, actorId: string) =>
	inOwnerTransaction(actorId, async (transaction) => {
		const [recipient] = await transaction.select(columns).from(user).where(eq(user.id, id));
		if (
			!recipient?.authUserId ||
			recipient.banned ||
			recipient.passwordPending ||
			!isRole(recipient.role) ||
			recipient.role === "superuser"
		)
			throw new ActionError("Choose an active staff member who has set their password.");
		if (recipient.version !== version)
			throw new ActionError("This account changed. Refresh before transferring ownership.");
		await transaction
			.update(user)
			.set({ role: "superuser", updatedAt: sql`now()`, version: sql`${user.version} + 1` })
			.where(eq(user.id, id));
		await transaction
			.update(user)
			.set({ role: "manager", updatedAt: sql`now()`, version: sql`${user.version} + 1` })
			.where(eq(user.id, actorId));
	});
