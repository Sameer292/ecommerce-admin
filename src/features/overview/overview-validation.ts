import { z } from "zod";

export const defaultRange = 30;
export const overviewSearchSchema = z.object({
	range: z.coerce
		.number<number>()
		.pipe(z.literal([7, 30, 90]))
		.catch(defaultRange)
		.default(defaultRange),
});
