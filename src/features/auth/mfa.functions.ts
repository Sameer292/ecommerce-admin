import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { object as ZObject, string as ZString, uuid as ZUuid } from "zod";
import { formDataSchema } from "@/lib/validation";
import { ActionError, mutate } from "@/server/mutation.server";
import { getStaffIdentity } from "./session.server";
import { getSupabaseAuth } from "./supabase.server";

const mfaCodeSchema = ZObject({
	factorId: ZUuid(),
	code: ZString().regex(/^\d{6}$/, "Enter the six-digit authenticator code."),
});

export const readVerifiedFactors = createServerFn().handler(async () => {
	const identity = await getStaffIdentity();
	if (!identity || identity.assured) return [];
	const { data, error } = await getSupabaseAuth().mfa.listFactors();
	if (error) throw new Error("Couldn’t load authenticator details. Try again.");
	return data.totp.map(({ id, friendly_name }) => ({
		id,
		name: friendly_name ?? "Authenticator app",
	}));
});

export const startAuthenticator = createServerFn({ method: "POST" }).handler(async () => {
	setResponseHeader("Cache-Control", "no-store");
	const identity = await getStaffIdentity();
	if (!identity || identity.assured)
		return { error: "Sign in again before setting up an authenticator." };
	const { mfa } = getSupabaseAuth();
	const { data: factors, error: factorError } = await mfa.listFactors();
	if (factorError || factors.all.some((factor) => factor.status === "verified")) {
		return { error: "Use an existing authenticator to verify this sign-in." };
	}
	for (const factor of factors.all.filter(
		(entry) => entry.factor_type === "totp" && entry.status === "unverified",
	)) {
		const { error } = await mfa.unenroll({ factorId: factor.id });
		if (error) return { error: "Couldn’t restart authenticator setup. Try signing in again." };
	}
	const { data, error } = await mfa.enroll({
		factorType: "totp",
		issuer: "Store admin",
		friendlyName: "Store admin",
	});
	if (error) return { error: "Couldn’t start authenticator setup. Try again." };
	return { data: { id: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret } };
});

export const verifyAuthenticator = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(({ data }) =>
		mutate(mfaCodeSchema, data, async ({ factorId, code }) => {
			const identity = await getStaffIdentity();
			if (!identity || identity.assured)
				throw new ActionError("Sign in again before verifying an authenticator.");
			const { error } = await getSupabaseAuth().mfa.challengeAndVerify({ factorId, code });
			if (error?.status === 429) throw new ActionError("Too many attempts. Try again in a minute.");
			if (error) throw new ActionError("Check the latest code in your authenticator app.", "code");
		}),
	);
