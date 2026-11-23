import type { ZodType } from "zod";
import { databaseCode } from "./db-errors.server";
import type { MutationResult } from "./mutation.types";

export class ActionError extends Error {}

const getMutationError = (error: unknown, constraints?: Record<string, string>) => {
	if (error instanceof ActionError) return error.message;
	const code = databaseCode(error);
	const message = typeof code === "string" ? constraints?.[code] : undefined;
	if (message) return message;
	console.error("Admin write failed", {
		code,
		name: error instanceof Error ? error.name : undefined,
	});
	return "Couldn’t save the change. Please try again.";
};

export const mutate = async <Value>(
	schema: ZodType<Value>,
	form: FormData,
	save: (value: Value) => Promise<unknown>,
	constraints?: Record<string, string>,
): Promise<MutationResult> => {
	const parsed = schema.safeParse(Object.fromEntries(form));
	if (!parsed.success) {
		return { success: false, error: parsed.error.issues[0]?.message ?? "Check the form values." };
	}
	try {
		await save(parsed.data);
		return { success: true };
	} catch (error) {
		return { success: false, error: getMutationError(error, constraints) };
	}
};
