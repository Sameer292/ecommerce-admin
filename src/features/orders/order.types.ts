import type { z } from "zod";
import type { orderEvents, orderItems, orders } from "@/db/schema/orders";
import type { orderStatuses, paymentStatuses } from "./order-options";
import type {
	orderDetailSearchSchema,
	orderFormSchema,
	orderSearchSchema,
} from "./order-validation";

export type Order = Omit<typeof orders.$inferSelect, "importDigest">;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderStatus = (typeof orderStatuses)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];
export type OrderRow = Pick<
	Order,
	"id" | "number" | "status" | "paymentStatus" | "totalMinor" | "createdAt"
> & {
	customerName: string;
};
export type OrderActivity = typeof orderEvents.$inferSelect & { staffName: string | null };
export type OrderSearch = z.output<typeof orderSearchSchema>;
export type OrderDetailSearch = z.output<typeof orderDetailSearchSchema>;
export type OrderValues = z.output<typeof orderFormSchema>;
