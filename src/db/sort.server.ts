import { asc, desc, sql, type SQLWrapper } from "drizzle-orm";
import { sortColumn, type Sort } from "@/lib/sort";

export const alphabetical = (column: SQLWrapper) => sql`lower(${column})`;

export const orderBySort = (columns: Record<string, SQLWrapper>, sort: Sort, id: SQLWrapper) => {
	const direction = sort.endsWith(".desc") ? desc : asc;
	return [direction(columns[sortColumn(sort)]), direction(id)];
};
