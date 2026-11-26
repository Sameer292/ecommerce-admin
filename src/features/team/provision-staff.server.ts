import { and, eq, isNull, sql } from "drizzle-orm";
import { inStaffAudit } from "@/db/audit-actor.server";
import { db } from "@/db/client.server";
import { user } from "@/db/schema/auth";
import { supabaseAdmin } from "@/features/auth/supabase-admin.server";
import { ActionError } from "@/server/mutation.server";
import type { StaffValues } from "./team.types";

const linkStaffProfile = (
	authUserId: string,
	profile: Omit<StaffValues, "password">,
	actorId?: string,
) =>
	inStaffAudit(actorId, async (transaction) => {
		const [staff] = await transaction
			.insert(user)
			.values({ id: authUserId, authUserId, ...profile })
			.onConflictDoUpdate({
				target: user.email,
				set: { authUserId, updatedAt: new Date(), version: sql`${user.version} + 1` },
				setWhere: and(isNull(user.authUserId), eq(user.role, profile.role)),
			})
			.returning({ id: user.id });
		if (!staff)
			throw new ActionError("This email already has a staff account or has a different role.");
	});

export const createStaffAccount = async (
	{ password, ...profile }: StaffValues,
	actorId?: string,
) => {
	const { data, error } = await supabaseAdmin.createUser({
		email: profile.email,
		password,
		email_confirm: true,
	});
	if (error || !data.user) {
		if (error?.code === "email_exists" || error?.code === "user_already_exists") {
			throw new ActionError("This email is already in use in Supabase Auth.");
		}
		throw error ?? new ActionError("Couldn’t create a Supabase Auth account.");
	}
	try {
		await linkStaffProfile(data.user.id, profile, actorId);
	} catch (cause) {
		const { error: cleanupError } = await supabaseAdmin.deleteUser(data.user.id);
		if (cleanupError) console.error("Couldn’t remove unlinked Supabase user", { id: data.user.id });
		throw cause;
	}
};

export const inviteStaffAccount = async (
	profile: Omit<StaffValues, "password">,
	actorId: string,
) => {
	const [existing] = await db
		.select({ id: user.authUserId, role: user.role })
		.from(user)
		.where(eq(user.email, profile.email));
	if (existing && (existing.id || existing.role !== profile.role))
		throw new ActionError(
			"This email already has a staff account or has a different role.",
			"email",
		);
	const { data, error } = await supabaseAdmin.inviteUserByEmail(profile.email);
	if (error || !data.user) {
		if (error?.code === "email_exists" || error?.code === "user_already_exists")
			throw new ActionError("This email is already in use in Supabase Auth.", "email");
		throw error ?? new ActionError("Couldn’t send the staff invitation.");
	}
	await linkStaffProfile(data.user.id, profile, actorId);
};
