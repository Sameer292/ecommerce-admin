import { Link } from "@tanstack/react-router";
import { FormSection } from "@/components/admin/form-section";
import { Separator } from "@/components/ui/separator";
import { formatMoney } from "@/lib/format";
import { PaymentStatusBadge } from "./order-labels";
import type { Order } from "./order.types";

const AmountRow = ({
	label,
	amount,
	currency,
}: {
	label: string;
	amount: number;
	currency: string;
}) => (
	<div className="flex justify-between gap-2">
		<dt>{label}</dt>
		<dd className="font-medium tabular-nums">{formatMoney(amount, currency)}</dd>
	</div>
);

export const OrderPayment = ({
	order,
	currency,
	refundedMinor,
}: {
	order: Order;
	currency: string;
	refundedMinor: number;
}) => (
	<FormSection title="Payment">
		<PaymentStatusBadge status={order.paymentStatus} />
		<p className="text-sm text-muted-foreground">
			Collection · {order.cashOnDelivery ? "Cash on delivery" : "Prepaid"}
		</p>
		<dl className="flex flex-col gap-2 text-sm">
			<AmountRow label="Subtotal" amount={order.subtotalMinor} currency={currency} />
			<AmountRow label="Shipping" amount={order.shippingMinor} currency={currency} />
			<AmountRow label="Tax" amount={order.taxMinor} currency={currency} />
			<AmountRow label="Discount" amount={-order.discountMinor || 0} currency={currency} />
			<div className="mt-2 border-t pt-3 font-semibold">
				<AmountRow label="Total" amount={order.totalMinor} currency={currency} />
			</div>
			{refundedMinor > 0 && (
				<AmountRow label="Refunded" amount={refundedMinor} currency={currency} />
			)}
		</dl>
	</FormSection>
);

export const OrderContact = ({ order }: { order: Order }) => (
	<FormSection title="Customer and delivery">
		<div className="flex flex-col gap-1 text-sm">
			<p className="font-medium">Buyer on this order</p>
			<p>{order.buyerName || "Name unavailable"}</p>
			{order.buyerEmail && (
				<p className="wrap-anywhere text-muted-foreground">{order.buyerEmail}</p>
			)}
			{order.buyerPhone && <p className="text-muted-foreground">{order.buyerPhone}</p>}
			<Link
				to="/customers/$customerId"
				params={{ customerId: order.customerId }}
				className="mt-1 self-start underline underline-offset-3"
			>
				Current customer profile
			</Link>
		</div>
		<Separator />
		<div className="flex flex-col gap-1 text-sm">
			<p className="font-medium">Shipping address</p>
			{order.shippingName && <p>{order.shippingName}</p>}
			<p className="whitespace-pre-line text-muted-foreground">
				{order.shippingAddress || "No address recorded."}
			</p>
		</div>
	</FormSection>
);
