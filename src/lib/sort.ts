import { z } from "zod";

export type Sort = `${string}.${"asc" | "desc"}`;

export const sortSchema = <const Fields extends readonly [string, ...string[]]>(
	...fields: Fields
) =>
	z
		.templateLiteral([z.enum(fields), ".", z.enum(["asc", "desc"])])
		.optional()
		.catch(undefined);

export const sortColumn = (sort: Sort) => sort.split(".")[0];

export const nextSort = (current: Sort, initial: Sort): Sort =>
	sortColumn(current) === sortColumn(initial)
		? `${sortColumn(current)}.${current.endsWith(".asc") ? "desc" : "asc"}`
		: initial;
