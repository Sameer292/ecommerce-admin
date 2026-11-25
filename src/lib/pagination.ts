import { coerce as ZCoerce, object as ZObject, string as ZString } from "zod";

export const pageSize = 20;
export const pageLimit = 100_000;
export const pageOffset = (page: number) => (page - 1) * pageSize;
export const lastPage = (total: number) =>
	Math.max(1, Math.min(pageLimit, Math.ceil(total / pageSize)));
export const clampPage = (page: number, total: number) =>
	Math.min(Math.max(1, page), lastPage(total));

export const pageSearchDefaults = { page: 1, q: "" };

export const pageSearchSchema = ZObject({
	page: ZCoerce.number()
		.int()
		.min(1)
		.max(pageLimit)
		.catch(pageSearchDefaults.page)
		.default(pageSearchDefaults.page),
	q: ZString().trim().max(100).catch(pageSearchDefaults.q).default(pageSearchDefaults.q),
});

export const searchPattern = (query: string) => `%${query.replace(/[\\%_]/g, "\\$&")}%`;
