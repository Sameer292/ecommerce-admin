import { RecordLink } from "@/components/admin/record-link";
import { DataTable } from "@/components/admin/data-table";
import type { Column, TableSorting } from "@/components/admin/list.types";
import { formatDate, formatMoney } from "@/lib/format";
import { OrderStatusBadge, PaymentStatusBadge } from "./order-labels";
import type { OrderRow } from "./order.types";

const OrderNumber = ({ id, number }: Pick<OrderRow, "id" | "number">) => (
	<RecordLink
		to="/orders/$orderId"
		params={{ orderId: id }}
		className="font-medium wrap-anywhere hover:underline"
	>
		#{number}
	</RecordLink>
);

const columns = (currency: string, zone: string): Column<OrderRow>[] => [
	{
		label: "Order",
		className: "min-w-24 px-3 md:min-w-35 md:px-4",
		sort: "number.asc",
		cell: (row) => <OrderNumber {...row} />,
	},
	{
		label: "Status",
		className: "min-w-0 px-2 md:min-w-24 md:px-4",
		cell: (row) => (
			<div className="flex flex-col items-start gap-1">
				<OrderStatusBadge status={row.status} />
				<div className="md:hidden">
					<PaymentStatusBadge status={row.paymentStatus} />
				</div>
			</div>
		),
	},
	{
		label: "Total",
		sort: "total.asc",
		compact: true,
		className: "px-3 text-right tabular-nums md:px-4",
		cell: (row) => formatMoney(row.totalMinor, currency),
	},
	{
		label: "Payment",
		className: "hidden md:table-cell",
		cell: (row) => <PaymentStatusBadge status={row.paymentStatus} />,
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
