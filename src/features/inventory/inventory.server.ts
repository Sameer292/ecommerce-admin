import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client.server";
import { alphabetical, orderBySort } from "@/db/sort.server";
import { user } from "@/db/schema/auth";
import { products } from "@/db/schema/catalog";
import { stockAdjustments, type StockLevels } from "@/db/schema/inventory";
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
				reference: stockAdjustments.reference,
				before: stockAdjustments.before,
				after: stockAdjustments.after,
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
export const stockLevelColumns = {
	stock: products.stock,
	reservedStock: products.reservedStock,
	incomingStock: products.incomingStock,
	damagedStock: products.damagedStock,
};

const claimAdjustment = async (
	transaction: Transaction,
	input: Adjustment,
	before: StockLevels,
	after: StockLevels,
) => {
	const [entry] = await transaction
		.insert(stockAdjustments)
		.values({ ...input, before, after })
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
		prior.reference !== (input.reference ?? null) ||
		prior.staffId !== input.staffId
	) {
		throw new ActionError("This adjustment has already been used. Refresh before trying again.");
	}
	return false;
};

export const adjustStockInTransaction = async (transaction: Transaction, input: Adjustment) => {
	const [before] = await transaction
		.select(stockLevelColumns)
		.from(products)
		.where(eq(products.id, input.productId))
		.for("update");
	if (!before) throw new ActionError("This product no longer exists.");
	const after = { ...before, stock: before.stock + input.delta };
	if (!(await claimAdjustment(transaction, input, before, after))) return;
	if (after.stock < after.reservedStock + after.damagedStock || after.stock > 2147483647)
		throw new ActionError("This adjustment would put stock outside its allowed range.");
	await transaction
		.update(products)
		.set({ stock: after.stock, updatedAt: new Date() })
		.where(eq(products.id, input.productId));
};

export const adjustStock = (input: Adjustment) =>
	db.transaction((transaction) => adjustStockInTransaction(transaction, input));
