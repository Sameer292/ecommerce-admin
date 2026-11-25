export type FieldErrors = Record<string, string | undefined>;
export type MutationFailure = { success: false; error: string; fieldErrors?: FieldErrors };
export type MutationResult = { success: true } | MutationFailure;
