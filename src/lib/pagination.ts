import { z } from "zod";

export const pageSize = 20;
export const pageLimit = 100_000;
export const pageOffset = (page: number) => (page - 1) * pageSize;

export const pageSearchSchema = z.object({
	page: z.coerce.number().int().min(1).max(pageLimit).catch(1).default(1),
	q: z.string().trim().max(100).catch("").default(""),
});

export const searchPattern = (query: string) => `%${query.replace(/[\\%_]/g, "\\$&")}%`;
