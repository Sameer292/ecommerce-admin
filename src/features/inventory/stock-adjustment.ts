import type { StockLevels } from "@/db/schema/inventory";

export const adjustmentKinds = [
	"receiving",
	"damage",
	"correction",
	"stocktake",
	"incoming",
] as const;
export type AdjustmentKind = (typeof adjustmentKinds)[number];
export const adjustmentLabels: Record<AdjustmentKind, string> = {
	receiving: "Receive units",
	damage: "Set damaged quantity",
	correction: "Correct on-hand balance",
	stocktake: "Set counted quantity",
	incoming: "Set incoming quantity",
};

export const stockLevelVersion = ({
	stock,
	reservedStock,
	incomingStock,
	damagedStock,
}: StockLevels) => [stock, reservedStock, incomingStock, damagedStock].join(":");

export const availableUnits = ({ stock, reservedStock, damagedStock }: StockLevels) =>
	stock - reservedStock - damagedStock;

export const stockLevelsValid = (levels: StockLevels) =>
	availableUnits(levels) >= 0 &&
	[levels.stock, levels.reservedStock, levels.incomingStock, levels.damagedStock].every(
		(amount) => Number.isInteger(amount) && amount >= 0 && amount <= 2_147_483_647,
	);

export const projectStock = (
	before: StockLevels,
	kind: AdjustmentKind,
	quantity: number,
): StockLevels => {
	switch (kind) {
		case "receiving":
			return {
				...before,
				stock: before.stock + quantity,
				incomingStock: Math.max(0, before.incomingStock - quantity),
			};
		case "damage":
			return { ...before, damagedStock: quantity };
		case "correction":
			return { ...before, stock: before.stock + quantity };
		case "stocktake":
			return { ...before, stock: quantity };
		case "incoming":
			return { ...before, incomingStock: quantity };
	}
};
