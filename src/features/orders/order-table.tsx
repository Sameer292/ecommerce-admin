import { Link } from "@tanstack/react-router";
import { DataTable } from "@/components/admin/data-table";
import type { Column, TableSorting } from "@/components/admin/list.types";
import { formatDate, formatMoney } from "@/lib/format";
import { OrderStatusBadge, PaymentStatusBadge } from "./order-labels";
import type { OrderRow } from "./order.types";

const OrderNumber = ({ id, number }: Pick<OrderRow, "id" | "number">) => (
	<Link to="/orders/$orderId" params={{ orderId: id }} className="font-medium hover:underline">
		#{number}
	</Link>
);

const columns = (currency: string, zone: string): Column<OrderRow>[] => [
	{
		label: "Order",
		className: "min-w-35",
		sort: "number.asc",
		cell: (row) => <OrderNumber {...row} />,
	},
	{
		label: "Customer",
		className: "min-w-35",
		sort: "customer.asc",
		cell: (row) => row.customerName,
	},
	{
		label: "Date",
		className: "min-w-35",

		sort: "date.desc",
		cell: (row) => formatDate(row.createdAt, zone),
	},
	{ label: "Status", cell: (row) => <OrderStatusBadge status={row.status} /> },
	{
		label: "Payment",
		// compact: true,
		cell: (row) => <PaymentStatusBadge status={row.paymentStatus} />,
	},
	{
		label: "Total",
		sort: "total.asc",
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
	sorting,
}: {
	rows: OrderRow[];
	currency: string;
	zone: string;
	empty?: string;
	sorting?: TableSorting;
}) => (
	<DataTable
		sorting={sorting}
		rows={rows}
		columns={columns(currency, zone)}
		label="Orders"
		empty={empty}
	/>
);
