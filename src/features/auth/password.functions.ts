import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { and, eq, sql } from "drizzle-orm";
import { enum as ZEnum, object as ZObject, string as ZString, uuid as ZUuid } from "zod";
import { db } from "@/db/client.server";
import { staffPasswordGrants, user } from "@/db/schema/auth";
import { formDataSchema } from "@/lib/validation";
import { ActionError, mutate } from "@/server/mutation.server";
import { logRequestFailure } from "@/server/request-diagnostics.server";
import { staffEmailSchema, staffPasswordSchema } from "./auth-validation";
import { findActiveStaff, getStaffIdentity } from "./session.server";
import { getSupabaseAuth } from "./supabase.server";

const passwordRecoverySchema = ZObject({ email: staffEmailSchema });
const passwordLinkSchema = ZObject({
	type: ZEnum(["invite", "recovery"]),
	tokenHash: ZString().trim().min(20).max(256),
});
const setPasswordSchema = ZObject({
	password: staffPasswordSchema,
	confirmation: staffPasswordSchema,
}).refine(({ password, confirmation }) => password === confirmation, {
	path: ["confirmation"],
	message: "Passwords must match.",
});

export const requestStaffPasswordReset = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(({ data }) =>
		mutate(passwordRecoverySchema, data, async ({ email }) => {
			const [account] = await db
				.select({ id: user.authUserId, banned: user.banned })
				.from(user)
				.where(eq(user.email, email));
			if (!account?.id || account.banned) return;
			const { error } = await getSupabaseAuth().resetPasswordForEmail(email);
			if (error && error.status !== 429) logRequestFailure("send staff password reset", error);
		}),
	);

export const redeemStaffPasswordLink = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(({ data }) => {
		setResponseHeader("Cache-Control", "no-store");
		return mutate(passwordLinkSchema, data, async ({ type, tokenHash }) => {
			const auth = getSupabaseAuth();
			const { data: verified, error } = await auth.verifyOtp({ type, token_hash: tokenHash });
			const inactive = "This link is invalid or expired. Request a new password link.";
			if (error || !verified.user || !verified.session) throw new ActionError(inactive);
			try {
				const staff = await findActiveStaff(verified.user.id);
				const claims = await auth.getClaims(verified.session.access_token);
				const parsed = ZUuid().safeParse(claims.data?.claims.session_id);
				if (!staff || !parsed.success || claims.data?.claims.sub !== verified.user.id)
					throw new ActionError(inactive);
				await db.insert(staffPasswordGrants).values({
					sessionId: parsed.data,
					staffId: staff.id,
					expiresAt: new Date(Date.now() + 15 * 60_000),
				});
			} catch (error) {
				await auth.signOut({ scope: "local" });
				throw error;
			}
		});
	});

export const readPasswordGrant = createServerFn().handler(async () => {
	const identity = await getStaffIdentity();
	if (!identity?.passwordGrant) return identity?.staff.passwordPending ? "link-needed" : "missing";
	if (identity.passwordGrant.getTime() <= Date.now()) return "expired";
	return identity.hasFactor && !identity.assured ? "mfa" : "ready";
});

export const setStaffPasswordFromLink = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(({ data }) =>
		mutate(setPasswordSchema, data, async ({ password }) => {
			const identity = await getStaffIdentity();
			const expired = "This password session expired. Request a new link.";
			if (!identity?.passwordGrant) throw new ActionError(expired);
			if (identity.hasFactor && !identity.assured)
				throw new ActionError("Verify your authenticator before changing your password.");
			await db.transaction(async (transaction) => {
				const scope = and(
					eq(staffPasswordGrants.sessionId, identity.sessionId),
					eq(staffPasswordGrants.staffId, identity.staff.id),
				);
				const [grant] = await transaction
					.select()
					.from(staffPasswordGrants)
					.where(scope)
					.for("update");
				if (!grant || grant.expiresAt.getTime() <= Date.now()) throw new ActionError(expired);
				const auth = getSupabaseAuth();
				const { error } = await auth.updateUser({ password });
				if (error)
					throw new ActionError(
						"Couldn’t set this password. Try a different password or request a new link.",
						"password",
					);
				const { error: signOutError } = await auth.signOut({ scope: "global" });
				if (signOutError)
					throw new ActionError(
						"Your password changed. Sign out and sign in with the new password.",
					);
				await transaction
					.update(user)
					.set({ passwordPending: false, updatedAt: sql`now()`, version: sql`${user.version} + 1` })
					.where(and(eq(user.id, identity.staff.id), eq(user.passwordPending, true)));
				await transaction.delete(staffPasswordGrants).where(scope);
			});
		}),
	);
