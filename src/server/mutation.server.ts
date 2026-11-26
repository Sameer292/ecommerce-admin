import type { ZodType as ZType } from "zod";
import { databaseCode } from "./db-errors.server";
import type { FieldErrors, MutationResult } from "./mutation.types";
import { logRequestFailure } from "./request-diagnostics.server";

export class ActionError extends Error {
	constructor(
		message: string,
		readonly field?: string,
	) {
		super(message);
	}
}

const getMutationError = (
	error: unknown,
	operation: string,
	constraints?: Record<string, string>,
) => {
	if (error instanceof ActionError) return error.message;
	const code = databaseCode(error);
	const message = typeof code === "string" ? constraints?.[code] : undefined;
	if (message) return message;
	const requestId = logRequestFailure(operation, error);
	const messageWithRetry = "Couldn’t save the change. Please try again.";
	return requestId ? `${messageWithRetry} Reference ${requestId}.` : messageWithRetry;
};

export const mutate = async <Value>(
	schema: ZType<Value>,
	form: FormData,
	save: (value: Value) => Promise<unknown>,
	constraints?: Record<string, string>,
): Promise<MutationResult> => {
	const parsed = schema.safeParse(Object.fromEntries(form));
	if (!parsed.success) {
		const fieldErrors: FieldErrors = Object.create(null);
		let formError: string | undefined;
		for (const { path, message } of parsed.error.issues) {
			const field = path[0];
			if (typeof field === "string" && !["id", "version", "productId"].includes(field)) {
				fieldErrors[field] ??= message;
			} else formError ??= message;
		}
		return {
			success: false,
			error: formError ?? "Check the highlighted fields.",
			fieldErrors: { ...fieldErrors },
		};
	}
	try {
		await save(parsed.data);
		return { success: true };
	} catch (error) {
		if (error instanceof ActionError && error.field) {
			return {
				success: false,
				error: "Check the highlighted fields.",
				fieldErrors: { [error.field]: error.message },
			};
		}
		return {
			success: false,
			error: getMutationError(error, save.name || "admin form", constraints),
		};
	}
};
