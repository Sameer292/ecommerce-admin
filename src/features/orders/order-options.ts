import type { OrderStatus, PaymentStatus } from "./order.types";

export const orderStatuses = [
	"pending",
	"processing",
	"shipped",
	"delivered",
	"cancelled",
] as const;
export const paymentStatuses = ["pending", "paid", "refunded"] as const;
export const paymentEventStatuses = ["paid", "failed", "refunded"] as const;
export const returnStatuses = [
	"requested",
	"approved",
	"received",
	"rejected",
	"refunded",
] as const;
export const returnLabels = {
	requested: "Requested",
	approved: "Approved",
	received: "Received",
	rejected: "Rejected",
	refunded: "Refunded",
} as const;
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

export const canChangePaymentCollection = (status: OrderStatus, payment: PaymentStatus) =>
	payment === "pending" && (status === "pending" || status === "processing");

export const canCorrectDelivery = (status: OrderStatus) =>
	status === "pending" || status === "processing";

export const fulfillmentPaymentProblem = (
	current: OrderStatus,
	next: OrderStatus,
	payment: PaymentStatus,
	cashOnDelivery: boolean,
) => {
	if (current === next || next === "cancelled" || (current === "shipped" && next === "delivered"))
		return;
	if (payment === "refunded") return "Refunded orders cannot be processed or dispatched.";
	if (next === "shipped" && payment === "pending" && !cashOnDelivery)
		return "Record payment before shipping a prepaid order.";
};
