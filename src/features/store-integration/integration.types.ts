import type { z } from "zod";
import type { db } from "@/db/client.server";
import type { importOrderSchema, paymentUpdateSchema } from "./integration-validation";

export type ImportOrder = z.output<typeof importOrderSchema>;
export type PaymentUpdate = z.output<typeof paymentUpdateSchema>;
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
