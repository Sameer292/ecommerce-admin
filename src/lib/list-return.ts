import { z } from "zod";

export const listReturnSearchSchema = z.object({
	returnTo: z
		.string()
		.max(2_000)
		.regex(/^\/(products|categories|customers|inventory|orders|team)(\?[^#]*)?$/)
		.optional()
		.catch(undefined),
});

export const listReturnHref = (returnTo: unknown, fallback: string) => {
	const search = listReturnSearchSchema.parse({ returnTo });
	return search.returnTo?.split("?")[0] === fallback ? search.returnTo : fallback;
};
