import { email as ZEmail, object as ZObject, string as ZString } from "zod";

export const staffEmailSchema = ZString().trim().toLowerCase().max(254).pipe(ZEmail());
export const staffPasswordSchema = ZString()
	.min(12, "Use at least 12 characters for the password.")
	.refine(
		(password) => new TextEncoder().encode(password).length <= 72,
		"Use a password of at most 72 UTF-8 bytes.",
	);

const existingPassword = ZString().min(1).max(128);

export const signInSchema = ZObject({ email: staffEmailSchema, password: existingPassword });

export const changePasswordSchema = ZObject({
	currentPassword: existingPassword,
	newPassword: staffPasswordSchema,
	confirmation: ZString(),
}).refine(({ newPassword, confirmation }) => newPassword === confirmation, {
	message: "The new passwords don’t match.",
	path: ["confirmation"],
});
