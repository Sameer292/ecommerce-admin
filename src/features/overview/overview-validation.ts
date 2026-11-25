import { coerce as ZCoerce, literal as ZLiteral, object as ZObject } from "zod";

export const defaultRange = 30;
export const overviewSearchSchema = ZObject({
	range: ZCoerce.number<number>()
		.pipe(ZLiteral([7, 30, 90]))
		.catch(defaultRange)
		.default(defaultRange),
});
