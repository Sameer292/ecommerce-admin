import type { z } from "zod";
import type { customers } from "@/db/schema/customers";
import type { pageSearchSchema } from "@/lib/pagination";
import type { customerFormSchema } from "./customer-validation";

export type Customer = typeof customers.$inferSelect;
export type CustomerRow = Omit<Customer, "notes" | "updatedAt">;
export type CustomerValues = z.output<typeof customerFormSchema>;
export type CustomerSearch = z.output<typeof pageSearchSchema>;
