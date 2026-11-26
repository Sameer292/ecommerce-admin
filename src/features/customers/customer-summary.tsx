import { Link } from "@tanstack/react-router";
import { FormSection } from "@/components/admin/form-section";
import { OrderStatusBadge, PaymentStatusBadge } from "@/features/orders/order-labels";
import { formatCount, formatDate, formatMoney } from "@/lib/format";
import type { customerOrderSummary } from "./customers.server";

export const CustomerSummary = ({
	summary,
	currency,
	zone,
}: {
	summary: Awaited<ReturnType<typeof customerOrderSummary>>;
	currency: string;
	zone: string;
}) => {
	const values = [
		["Orders placed", formatCount(summary.count)],
		["Paid spend after refunds", formatMoney(summary.spend, currency)],
		["Average paid order", summary.average === null ? "—" : formatMoney(summary.average, currency)],
		["First order", summary.first ? formatDate(summary.first, zone) : "—"],
		["Latest order", summary.last ? formatDate(summary.last, zone) : "—"],
	];
	return (
		<FormSection title="Order summary">
			<dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
				{values.map(([label, value]) => (
					<div key={label}>
						<dt className="text-muted-foreground">{label}</dt>
						<dd className="font-medium tabular-nums">{value}</dd>
					</div>
				))}
			</dl>
			<div className="space-y-2">
				<h3 className="text-sm font-semibold">
					Outstanding orders ({formatCount(summary.openCount)})
				</h3>
				{summary.outstanding.length ? (
					<>
						{summary.openCount > summary.outstanding.length && (
							<p className="text-sm text-muted-foreground">Showing the five most recent.</p>
						)}
						<ul className="divide-y text-sm">
							{summary.outstanding.map((order) => (
								<li key={order.id} className="flex flex-wrap items-center gap-3 py-2">
									<Link
										to="/orders/$orderId"
										params={{ orderId: order.id }}
										className="font-medium underline"
									>
										#{order.number}
									</Link>
									<OrderStatusBadge status={order.status} />
									<PaymentStatusBadge status={order.paymentStatus} />
								</li>
							))}
						</ul>
					</>
				) : (
					<p className="text-sm text-muted-foreground">No outstanding orders.</p>
				)}
			</div>
		</FormSection>
	);
};
