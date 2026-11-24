import { createServerFn } from "@tanstack/react-start";
import { formDataSchema } from "@/lib/validation";
import { ActionError, mutate } from "@/server/mutation.server";
import { changePasswordSchema, signInSchema } from "./auth-validation";
import { findActiveStaff, requireStaff } from "./session.server";
import { getSupabaseAuth, verifyCurrentPassword } from "./supabase.server";

export const signInStaff = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(({ data }) =>
		mutate(signInSchema, data, async (credentials) => {
			const auth = getSupabaseAuth();
			const { data, error } = await auth.signInWithPassword(credentials);
			if (error?.status === 429) throw new ActionError("Too many attempts. Try again in a minute.");
			if (data.user && (await findActiveStaff(data.user.id))) return;
			if (data.session) await auth.signOut({ scope: "local" });
			throw new ActionError("Sign-in failed. Check your email and password.");
		}),
	);

export const signOutStaff = createServerFn({ method: "POST" }).handler(async () => {
	const { error } = await getSupabaseAuth().signOut({ scope: "local" });
	return { success: !error };
});

export const changeStaffPassword = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(async ({ data }) => {
		await requireStaff();
		return mutate(changePasswordSchema, data, async ({ currentPassword, newPassword }) => {
			const auth = getSupabaseAuth();
			const {
				data: { user },
			} = await auth.getUser();
			if (!user?.email || !(await verifyCurrentPassword(user.id, user.email, currentPassword))) {
				throw new ActionError("Check your current password and try again.");
			}
			const { error } = await auth.updateUser({
				current_password: currentPassword,
				password: newPassword,
			});
			if (error)
				throw new ActionError(
					"Couldn’t change the password. Sign in again or try a different new password.",
				);
		});
	});
