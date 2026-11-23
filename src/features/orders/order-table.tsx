import { Link } from "@tanstack/react-router";
import { DataTable } from "@/components/admin/data-table";
import type { Column } from "@/components/admin/list.types";
import { formatDate, formatMoney } from "@/lib/format";
import { OrderStatusBadge, PaymentStatusBadge } from "./order-labels";
import type { OrderRow } from "./order.types";

const OrderNumber = ({ id, number }: Pick<OrderRow, "id" | "number">) => (
	<Link to="/orders/$orderId" params={{ orderId: id }} className="font-medium hover:underline">
		#{number}
	</Link>
);

const columns = (currency: string, zone: string): Column<OrderRow>[] => [
	{ label: "Order", cell: (row) => <OrderNumber {...row} /> },
	{ label: "Customer", cell: (row) => row.customerName },
	{
		label: "Date",
		cell: (row) => formatDate(row.createdAt, zone),
	},
	{ label: "Status", compact: true, cell: (row) => <OrderStatusBadge status={row.status} /> },
	{
		label: "Payment",
		compact: true,
		cell: (row) => <PaymentStatusBadge status={row.paymentStatus} />,
	},
	{
		label: "Total",
		compact: true,
		className: "tabular-nums",
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
