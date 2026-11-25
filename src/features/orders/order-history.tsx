import { DataTable } from "@/components/admin/data-table";
import type { Column, ListPage, TableSorting } from "@/components/admin/list.types";
import { PageControls } from "@/components/admin/page-controls";
import { formatCount, formatDateTime, formatMoney } from "@/lib/format";
import { orderStatusLabels } from "./order-options";
import type { OrderActivity, OrderItem } from "./order.types";

const ItemName = ({ name, sku }: Pick<OrderItem, "name" | "sku">) => (
	<div className="flex flex-col gap-0.5">
		<span className="font-medium">{name}</span>
		<span className="text-xs text-muted-foreground">{sku}</span>
	</div>
);

const itemColumns = (currency: string): Column<OrderItem>[] => [
	{ label: "Item", sort: "name.asc", cell: (row) => <ItemName {...row} /> },
	{
		label: "Quantity",
		sort: "quantity.desc",
		compact: true,
		className: "text-right tabular-nums",
		cell: (row) => formatCount(row.quantity),
	},
	{
		label: "Unit price",
		sort: "price.asc",
		compact: true,
		className: "text-right tabular-nums",
		cell: (row) => formatMoney(row.unitPriceMinor, currency),
	},
	{
		label: "Total",
		sort: "total.asc",
		compact: true,
		className: "text-right tabular-nums",
		cell: (row) => formatMoney(row.unitPriceMinor * row.quantity, currency),
	},
];

const activityColumns = (zone: string): Column<OrderActivity>[] => [
	{
		label: "Date and time",
		sort: "date.desc",
		compact: true,
		cell: (row) => (
			<time dateTime={row.createdAt.toISOString()}>{formatDateTime(row.createdAt, zone)}</time>
		),
	},
	{ label: "Previous status", compact: true, cell: (row) => orderStatusLabels[row.previousStatus] },
	{ label: "New status", compact: true, cell: (row) => orderStatusLabels[row.status] },
	{ label: "Changed by", sort: "staff.asc", cell: (row) => row.staffName ?? "System" },
];

type OrderSectionProps<Row> = ListPage<Row> & {
	page: number;
	onPage: (page: number) => void;
	sorting: TableSorting;
};

export const OrderLines = ({
	rows,
	total,
	page,
	onPage,
	sorting,
	currency,
}: OrderSectionProps<OrderItem> & { currency: string }) => (
	<section className="flex min-w-0 flex-col gap-3" aria-labelledby="order-items-title">
		<h2 className="font-heading text-xl font-semibold" id="order-items-title">
			Items
		</h2>
		<DataTable
			sorting={sorting}
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
	sorting,
	zone,
}: OrderSectionProps<OrderActivity> & { zone: string }) => (
	<section className="flex min-w-0 flex-col gap-3" aria-labelledby="order-activity-title">
		<h2 className="font-heading text-xl font-semibold" id="order-activity-title">
			Status activity
		</h2>
		<p className="text-sm text-muted-foreground">Times shown in {zone}.</p>
		<DataTable
			sorting={sorting}
			rows={rows}
			columns={activityColumns(zone)}
			label="Status activity"
			empty="No status changes yet"
			compactEmpty
		/>
		<PageControls total={total} page={page} onPage={onPage} />
	</section>
);
