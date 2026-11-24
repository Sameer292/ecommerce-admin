import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client.server";
import { alphabetical, orderBySort } from "@/db/sort.server";
import { user } from "@/db/schema/auth";
import { products } from "@/db/schema/catalog";
import { stockAdjustments } from "@/db/schema/inventory";
import { pageOffset, pageSize } from "@/lib/pagination";
import type { Sort } from "@/lib/sort";
import { ActionError } from "@/server/mutation.server";
import type { AdjustmentInput } from "./inventory.types";

const stockHistorySortColumns = {
	date: stockAdjustments.createdAt,
	change: stockAdjustments.delta,
	staff: alphabetical(sql`coalesce(${user.name}, 'System')`),
};

export const findStockHistory = async (
	productId: string,
	page: number,
	sort: Sort = "date.desc",
) => {
	const where = eq(stockAdjustments.productId, productId);
	const [rows, total] = await Promise.all([
		db
			.select({
				id: stockAdjustments.id,
				delta: stockAdjustments.delta,
				reason: stockAdjustments.reason,
				createdAt: stockAdjustments.createdAt,
				staffName: user.name,
			})
			.from(stockAdjustments)
			.leftJoin(user, eq(stockAdjustments.staffId, user.id))
			.where(where)
			.orderBy(...orderBySort(stockHistorySortColumns, sort, stockAdjustments.id))
			.limit(pageSize)
			.offset(pageOffset(page)),
		db.$count(stockAdjustments, where),
	]);
	return { rows, total };
};

type Adjustment = AdjustmentInput & { staffId: string };
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const claimAdjustment = async (transaction: Transaction, input: Adjustment) => {
	const [entry] = await transaction
		.insert(stockAdjustments)
		.values(input)
		.onConflictDoNothing({ target: stockAdjustments.id })
		.returning({ id: stockAdjustments.id });
	if (entry) return true;
	const [prior] = await transaction
		.select()
		.from(stockAdjustments)
		.where(eq(stockAdjustments.id, input.id));
	if (
		prior?.productId !== input.productId ||
		prior.delta !== input.delta ||
		prior.reason !== input.reason ||
		prior.staffId !== input.staffId
	) {
		throw new ActionError("This adjustment has already been used. Refresh before trying again.");
	}
	return false;
};

export const adjustStock = (input: Adjustment) =>
	db.transaction(async (transaction) => {
		if (!(await claimAdjustment(transaction, input))) return;
		const newStock = sql`${products.stock}::bigint + ${input.delta}`;
		const [updated] = await transaction
			.update(products)
			.set({ stock: newStock, updatedAt: new Date() })
			.where(and(eq(products.id, input.productId), sql`${newStock} BETWEEN 0 AND 2147483647`))
			.returning({ id: products.id });
		if (!updated)
			throw new ActionError("This adjustment would put stock outside its allowed range.");
	});
