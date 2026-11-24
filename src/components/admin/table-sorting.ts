import type { ZodType } from "zod";
import type { Sort } from "@/lib/sort";
import type { ListSearch, TableSorting } from "./list.types";

export const listSorting = <Search extends ListSearch>(
	search: Search,
	fallback: Sort,
	schema: ZodType<Search>,
	onSearch: (search: Search) => void,
): TableSorting => ({
	value: search.sort ?? fallback,
	onChange: (sort) => onSearch(schema.parse({ ...search, page: 1, sort })),
});
