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
import { projectStock, stockLevelsValid, stockLevelVersion } from "./stock-adjustment";

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
				kind: stockAdjustments.kind,
				quantity: stockAdjustments.quantity,
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

type Adjustment = Pick<AdjustmentInput, "id" | "productId" | "reason" | "reference"> & {
	delta: number;
	staffId: string;
};
type LedgerEntry = Pick<
	typeof stockAdjustments.$inferInsert,
	"id" | "productId" | "reason" | "reference" | "staffId" | "kind" | "quantity"
>;
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export const stockLevelColumns = {
	stock: products.stock,
	reservedStock: products.reservedStock,
	incomingStock: products.incomingStock,
	damagedStock: products.damagedStock,
};

const claimAdjustment = async (
	transaction: Transaction,
	input: LedgerEntry,
	before: StockLevels,
	after: StockLevels,
) => {
	const [entry] = await transaction
		.insert(stockAdjustments)
		.values({ ...input, delta: after.stock - before.stock, before, after })
		.onConflictDoNothing({ target: stockAdjustments.id })
		.returning({ id: stockAdjustments.id });
	if (entry) return true;
	const [prior] = await transaction
		.select()
		.from(stockAdjustments)
		.where(eq(stockAdjustments.id, input.id));
	if (
		prior?.productId !== input.productId ||
		prior.kind !== (input.kind ?? null) ||
		(input.kind ? prior.quantity !== input.quantity : prior.delta !== after.stock - before.stock) ||
		prior.reason !== input.reason ||
		prior.reference !== (input.reference ?? null) ||
		prior.staffId !== (input.staffId ?? null)
	) {
		throw new ActionError("This adjustment has already been used. Refresh before trying again.");
	}
	return false;
};

const lockStock = async (transaction: Transaction, productId: string) => {
	const [before] = await transaction
		.select(stockLevelColumns)
		.from(products)
		.where(eq(products.id, productId))
		.for("update");
	if (!before) throw new ActionError("This product no longer exists.");
	return before;
};

export const writeStockLevels = async (
	transaction: Transaction,
	input: LedgerEntry,
	before: StockLevels,
	after: StockLevels,
	base?: string,
) => {
	if (!(await claimAdjustment(transaction, input, before, after))) return;
	if (base !== undefined && base !== stockLevelVersion(before))
		throw new ActionError("Stock changed. Refresh and review the projected balance before saving.");
	if (!stockLevelsValid(after))
		throw new ActionError("This adjustment would put stock outside its allowed range.");
	await transaction
		.update(products)
		.set({ ...after, updatedAt: new Date() })
		.where(eq(products.id, input.productId));
};

export const adjustStockInTransaction = async (transaction: Transaction, input: Adjustment) => {
	const before = await lockStock(transaction, input.productId);
	const { delta, ...entry } = input;
	return writeStockLevels(transaction, entry, before, { ...before, stock: before.stock + delta });
};

export const adjustStock = (input: Adjustment) =>
	db.transaction((transaction) => adjustStockInTransaction(transaction, input));

export const adjustStockManually = ({ base, ...entry }: AdjustmentInput & { staffId: string }) =>
	db.transaction(async (transaction) => {
		const before = await lockStock(transaction, entry.productId);
		return writeStockLevels(
			transaction,
			entry,
			before,
			projectStock(before, entry.kind, entry.quantity),
			base,
		);
	});
