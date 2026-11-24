import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client.server";
import { user } from "@/db/schema/auth";
import { supabaseAdmin } from "@/features/auth/supabase-admin.server";
import { ActionError } from "@/server/mutation.server";
import type { StaffValues } from "./team.types";

const linkStaffProfile = async (authUserId: string, profile: Omit<StaffValues, "password">) => {
	const [staff] = await db
		.insert(user)
		.values({ id: authUserId, authUserId, ...profile })
		.onConflictDoUpdate({
			target: user.email,
			set: { authUserId, updatedAt: new Date() },
			setWhere: and(isNull(user.authUserId), eq(user.role, profile.role)),
		})
		.returning({ id: user.id });
	if (!staff)
		throw new ActionError("This email already has a staff account or has a different role.");
};

export const createStaffAccount = async ({ password, ...profile }: StaffValues) => {
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
		await linkStaffProfile(data.user.id, profile);
	} catch (cause) {
		const { error: cleanupError } = await supabaseAdmin.deleteUser(data.user.id);
		if (cleanupError) console.error("Couldn’t remove unlinked Supabase user", { id: data.user.id });
		throw cause;
	}
};
