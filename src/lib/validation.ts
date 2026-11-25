import {
	instanceof as ZInstanceOf,
	int as ZInt,
	literal as ZLiteral,
	object as ZObject,
	string as ZString,
	union as ZUnion,
	uuid as ZUuid,
} from "zod";

export const idSchema = ZObject({ id: ZUuid() });
export const formDataSchema = ZInstanceOf(FormData);
export const optionalId = ZUnion([ZUuid(), ZLiteral("")]).transform((id) => id || undefined);
export const editVersionSchema = ZString()
	.regex(/^\d{1,10}$/, "Refresh before saving.")
	.transform(Number)
	.pipe(ZInt().min(0).max(2_147_483_647));
