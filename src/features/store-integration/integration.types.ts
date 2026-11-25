import type { output as ZOutput } from "zod";
import type { db } from "@/db/client.server";
import type { importOrderSchema, paymentUpdateSchema } from "./integration-validation";

export type ImportOrder = ZOutput<typeof importOrderSchema>;
export type PaymentUpdate = ZOutput<typeof paymentUpdateSchema>;
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
