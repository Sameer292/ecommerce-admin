import { StatusBadge } from "@/components/admin/status-badge";
import { orderStatusLabels, paymentStatusLabels } from "./order-options";
import type { OrderStatus, PaymentStatus } from "./order.types";

const statusTone = {
	pending: "warning",
	processing: "neutral",
	shipped: "neutral",
	delivered: "success",
	cancelled: "danger",
} as const;

export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => (
	<StatusBadge tone={statusTone[status]}>{orderStatusLabels[status]}</StatusBadge>
);

export const PaymentStatusBadge = ({ status }: { status: PaymentStatus }) => (
	<StatusBadge tone={status === "paid" ? "success" : "neutral"}>
		{paymentStatusLabels[status]}
	</StatusBadge>
);
