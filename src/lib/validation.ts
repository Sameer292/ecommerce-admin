import {
	instanceof as ZInstanceOf,
	literal as ZLiteral,
	object as ZObject,
	union as ZUnion,
	uuid as ZUuid,
} from "zod";

export const idSchema = ZObject({ id: ZUuid() });
export const formDataSchema = ZInstanceOf(FormData);
export const optionalId = ZUnion([ZUuid(), ZLiteral("")]).transform((id) => id || undefined);
