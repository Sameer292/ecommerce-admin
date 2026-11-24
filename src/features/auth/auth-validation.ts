import { z } from "zod";

export const staffEmailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());
export const staffPasswordSchema = z
	.string()
	.min(12, "Use at least 12 characters for the password.")
	.refine(
		(password) => new TextEncoder().encode(password).length <= 72,
		"Use a password of at most 72 UTF-8 bytes.",
	);

const existingPassword = z.string().min(1).max(128);

export const signInSchema = z.object({ email: staffEmailSchema, password: existingPassword });

export const changePasswordSchema = z
	.object({
		currentPassword: existingPassword,
		newPassword: staffPasswordSchema,
		confirmation: z.string(),
	})
	.refine(
		({ newPassword, confirmation }) => newPassword === confirmation,
		"The new passwords don’t match.",
	);
