import type { OrderStatus } from "./order.types";

export const orderStatuses = [
	"pending",
	"processing",
	"shipped",
	"delivered",
	"cancelled",
] as const;
export const paymentStatuses = ["pending", "paid", "refunded"] as const;
export const paymentEventStatuses = ["paid", "failed", "refunded"] as const;
export const paymentEventLabels = { paid: "Paid", failed: "Failed", refunded: "Refunded" } as const;

export const orderStatusLabels = {
	pending: "Pending",
	processing: "Processing",
	shipped: "Shipped",
	delivered: "Delivered",
	cancelled: "Cancelled",
} as const;

export const paymentStatusLabels = {
	pending: "Unpaid",
	paid: "Paid",
	refunded: "Refunded",
} as const;

export const orderTransitions = {
	pending: ["processing", "cancelled"],
	processing: ["shipped", "cancelled"],
	shipped: ["delivered"],
	delivered: [],
	cancelled: [],
} as const satisfies Record<OrderStatus, readonly OrderStatus[]>;

export const canTransitionOrder = (current: OrderStatus, next: OrderStatus) =>
	current === next || orderTransitions[current].some((status) => status === next);
