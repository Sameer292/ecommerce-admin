import type { z } from "zod";
import type { findStockHistory } from "./inventory.server";
import type { adjustmentSchema, inventorySearchSchema } from "./inventory-validation";

export type AdjustmentInput = z.output<typeof adjustmentSchema>;
export type InventorySearch = z.output<typeof inventorySearchSchema>;
export type StockHistoryRow = Awaited<ReturnType<typeof findStockHistory>>["rows"][number];
