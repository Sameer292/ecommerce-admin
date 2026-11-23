import { Link } from "@tanstack/react-router";
import { DataTable } from "@/components/admin/data-table";
import type { Column } from "@/components/admin/list.types";
import { formatDate, formatMoney } from "@/lib/format";
import { OrderStatusBadge, PaymentStatusBadge } from "./order-labels";
import type { OrderRow } from "./order.types";

const columns = (currency: string, zone: string): Column<OrderRow>[] => [
	{
		label: "Order",
		cell: (row) => (
			<Link
				to="/orders/$orderId"
				params={{ orderId: row.id }}
				className="font-medium hover:underline"
			>
				#{row.number}
			</Link>
		),
	},
	{ label: "Customer", cell: (row) => row.customerName },
	{
		label: "Date",
		cell: (row) => <span className="text-muted-foreground">{formatDate(row.createdAt, zone)}</span>,
	},
	{ label: "Status", cell: (row) => <OrderStatusBadge status={row.status} /> },
	{ label: "Payment", cell: (row) => <PaymentStatusBadge status={row.paymentStatus} /> },
	{
		label: "Total",
		className: "text-right tabular-nums",
		cell: (row) => formatMoney(row.totalMinor, currency),
	},
];

export const OrderTable = ({
	rows,
	currency,
	zone,
	empty = "No orders yet",
}: {
	rows: OrderRow[];
	currency: string;
	zone: string;
	empty?: string;
}) => <DataTable rows={rows} columns={columns(currency, zone)} label="Orders" empty={empty} />;
