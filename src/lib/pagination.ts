import { coerce as ZCoerce, literal as ZLiteral, object as ZObject, string as ZString } from "zod";

export const pageSize = 20;
export const pageSizes = [pageSize, 50, 100] as const;
export type ListPageSize = (typeof pageSizes)[number];
export const pageLimit = 100_000;
export const pageOffset = (page: number, size = pageSize) => (page - 1) * size;
export const lastPage = (total: number, size = pageSize) =>
	Math.max(1, Math.min(pageLimit, Math.ceil(total / size)));
export const clampPage = (page: number, total: number, size = pageSize) =>
	Math.min(Math.max(1, page), lastPage(total, size));

export const pageSearchDefaults = { page: 1, q: "" };

export const pageSearchSchema = ZObject({
	page: ZCoerce.number()
		.int()
		.min(1)
		.max(pageLimit)
		.catch(pageSearchDefaults.page)
		.default(pageSearchDefaults.page),
	q: ZString().trim().max(100).catch(pageSearchDefaults.q).default(pageSearchDefaults.q),
	perPage: ZLiteral(pageSizes).optional().catch(undefined),
});

export const searchPattern = (query: string) => `%${query.replace(/[\\%_]/g, "\\$&")}%`;
