import { DataTable } from "@/components/admin/data-table";
import type { Column, ListPage } from "@/components/admin/list.types";
import { PageControls } from "@/components/admin/page-controls";
import { formatCount, formatDate, formatMoney } from "@/lib/format";
import { orderStatusLabels } from "./order-options";
import type { OrderActivity, OrderItem } from "./order.types";

const itemColumns = (currency: string): Column<OrderItem>[] => [
	{
		label: "Item",
		cell: (row) => (
			<div className="flex flex-col gap-0.5">
				<span className="font-medium">{row.name}</span>
				<span className="text-xs text-muted-foreground">{row.sku}</span>
			</div>
		),
	},
	{
		label: "Quantity",
		className: "text-right tabular-nums",
		cell: (row) => formatCount(row.quantity),
	},
	{
		label: "Unit price",
		className: "text-right tabular-nums",
		cell: (row) => formatMoney(row.unitPriceMinor, currency),
	},
	{
		label: "Total",
		className: "text-right tabular-nums",
		cell: (row) => formatMoney(row.unitPriceMinor * row.quantity, currency),
	},
];

const activityColumns = (zone: string): Column<OrderActivity>[] => [
	{ label: "Date", cell: (row) => formatDate(row.createdAt, zone) },
	{ label: "Previous status", cell: (row) => orderStatusLabels[row.previousStatus] },
	{ label: "New status", cell: (row) => orderStatusLabels[row.status] },
	{ label: "Changed by", cell: (row) => row.staffName ?? "System" },
];

type OrderSectionProps<Row> = ListPage<Row> & {
	page: number;
	onPage: (page: number) => void;
};

export const OrderLines = ({
	rows,
	total,
	page,
	onPage,
	currency,
}: OrderSectionProps<OrderItem> & { currency: string }) => (
	<section className="flex min-w-0 flex-col gap-3" aria-labelledby="order-items-title">
		<h2 className="font-heading text-xl font-semibold" id="order-items-title">
			Items
		</h2>
		<DataTable
			rows={rows}
			columns={itemColumns(currency)}
			label="Items"
			empty="No line items recorded"
		/>
		<PageControls total={total} page={page} onPage={onPage} />
	</section>
);

export const OrderHistory = ({
	rows,
	total,
	page,
	onPage,
	zone,
}: OrderSectionProps<OrderActivity> & { zone: string }) => (
	<section className="flex min-w-0 flex-col gap-3" aria-labelledby="order-activity-title">
		<h2 className="font-heading text-xl font-semibold" id="order-activity-title">
			Status activity
		</h2>
		<DataTable
			rows={rows}
			columns={activityColumns(zone)}
			label="Status activity"
			empty="No status changes yet"
		/>
		<PageControls total={total} page={page} onPage={onPage} />
	</section>
);
