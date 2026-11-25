import type { output as ZOutput } from "zod";
import type { findStockHistory } from "./inventory.server";
import type { adjustmentSchema, inventorySearchSchema } from "./inventory-validation";

export type AdjustmentInput = ZOutput<typeof adjustmentSchema>;
export type InventorySearch = ZOutput<typeof inventorySearchSchema>;
export type StockHistoryRow = Awaited<ReturnType<typeof findStockHistory>>["rows"][number];
