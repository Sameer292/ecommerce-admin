import type { output as ZOutput } from "zod";
import type { orderEvents, orderItems, orders, paymentEvents } from "@/db/schema/orders";
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
export type PaymentEvent = typeof paymentEvents.$inferSelect;
export type OrderSearch = ZOutput<typeof orderSearchSchema>;
export type OrderDetailSearch = ZOutput<typeof orderDetailSearchSchema>;
export type OrderValues = ZOutput<typeof orderFormSchema>;
