import {
	discriminatedUnion as ZDiscriminatedUnion,
	int as ZInt,
	literal as ZLiteral,
	object as ZObject,
	string as ZString,
	uuid as ZUuid,
} from "zod";
import type { output as ZOutput } from "zod";

const identity = ZObject({ id: ZUuid(), orderId: ZUuid() });

export const orderReturnSchema = ZDiscriminatedUnion("action", [
	identity.extend({
		action: ZLiteral("request"),
		itemId: ZUuid(),
		quantity: ZString().regex(/^\d+$/).transform(Number).pipe(ZInt().min(1).max(1_000_000)),
		reason: ZString().trim().min(1, "Enter a return reason.").max(500),
	}),
	identity.extend({ action: ZLiteral("approve") }),
	identity.extend({ action: ZLiteral("reject") }),
	identity.extend({
		action: ZLiteral("receive"),
		restock: ZLiteral("on").optional().transform(Boolean),
	}),
]);

export type ReturnValues = ZOutput<typeof orderReturnSchema>;
