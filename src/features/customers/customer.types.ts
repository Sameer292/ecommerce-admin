import type { z } from "zod";
import type { customers } from "@/db/schema/customers";
import type { customerFormSchema, customerSearchSchema } from "./customer-validation";

export type Customer = typeof customers.$inferSelect;
export type CustomerRow = Omit<Customer, "notes" | "updatedAt"> & { totalPurchasesMinor: number };
export type CustomerValues = z.output<typeof customerFormSchema>;
export type CustomerSearch = z.output<typeof customerSearchSchema>;
