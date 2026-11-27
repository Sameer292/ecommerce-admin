import { DataTable } from "@/components/admin/data-table";
import type { Column, ListPage, TableSorting } from "@/components/admin/list.types";
import { PageControls, type PageControlsProps } from "@/components/admin/page-controls";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatCount, formatDateTime, formatMoney } from "@/lib/format";
import { orderStatusLabels, paymentEventLabels } from "./order-options";
import type { OrderActivity, OrderItem, PaymentEvent } from "./order.types";

const ItemName = ({ name, sku, productId }: Pick<OrderItem, "name" | "sku" | "productId">) => (
	<div className="flex flex-col items-start gap-1">
		{productId ? (
			<Link
				to="/products/$productId"
				params={{ productId }}
				className="font-medium hover:underline"
			>
				{name}
			</Link>
		) : (
			<span className="font-medium">{name}</span>
		)}
		<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
			<span>{sku}</span>
			{productId ? (
				<Link
					to="/inventory/$productId"
					params={{ productId }}
					aria-label={`Inventory for ${sku}`}
					className="underline underline-offset-3"
				>
					Inventory
				</Link>
			) : (
				<StatusBadge tone="warning">Unlinked SKU</StatusBadge>
			)}
		</div>
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
	{
		label: "Changes",
		cell: ({ fields, reason }) =>
			fields.length > 0 ? (
				<div className="flex flex-col gap-1">
					<span>{fields.join(", ")}</span>
					{reason && <span className="text-muted-foreground">{reason}</span>}
				</div>
			) : (
				"—"
			),
	},
	{ label: "Changed by", sort: "staff.asc", cell: (row) => row.staffName ?? "System" },
];

type OrderSectionProps<Row> = ListPage<Row> & {
	pagination: Omit<PageControlsProps, "total">;
	sorting: TableSorting;
};

export const OrderLines = ({
	rows,
	total,
	pagination,
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
		<PageControls total={total} {...pagination} />
	</section>
);

export const OrderHistory = ({
	rows,
	total,
	pagination,
	sorting,
	zone,
}: OrderSectionProps<OrderActivity> & { zone: string }) => (
	<section className="flex min-w-0 flex-col gap-3" aria-labelledby="order-activity-title">
		<h2 className="font-heading text-xl font-semibold" id="order-activity-title">
			Fulfillment activity
		</h2>
		<p className="text-sm text-muted-foreground">Times shown in {zone}.</p>
		<DataTable
			sorting={sorting}
			rows={rows}
			columns={activityColumns(zone)}
			label="Fulfillment activity"
			empty="No fulfillment changes yet"
			compactEmpty
		/>
		<PageControls total={total} {...pagination} />
	</section>
);

const paymentColumns = (currency: string, zone: string): Column<PaymentEvent>[] => [
	{
		label: "Date and time",
		cell: ({ occurredAt }) =>
			occurredAt ? (
				<time dateTime={occurredAt.toISOString()}>{formatDateTime(occurredAt, zone)}</time>
			) : (
				"Date unavailable"
			),
	},
	{ label: "Event", cell: ({ status }) => paymentEventLabels[status] },
	{
		label: "Amount",
		className: "text-right tabular-nums",
		cell: ({ amountMinor }) => formatMoney(amountMinor, currency),
	},
	{ label: "Source", cell: ({ source }) => source },
	{ label: "Method", cell: ({ method }) => method ?? "—" },
	{ label: "Reference", className: "wrap-anywhere", cell: ({ externalId }) => externalId ?? "—" },
];

export const PaymentHistory = ({
	rows,
	total,
	pagination,
	currency,
	zone,
}: Omit<OrderSectionProps<PaymentEvent>, "sorting"> & { currency: string; zone: string }) => (
	<section aria-labelledby="order-payments-title" className="flex min-w-0 flex-col gap-3">
		<h2 id="order-payments-title" className="font-heading text-xl font-semibold">
			Payment history
		</h2>
		<p className="text-sm text-muted-foreground">Times shown in {zone}.</p>
		<DataTable
			rows={rows}
			columns={paymentColumns(currency, zone)}
			label="Payment history"
			empty="No payment events yet"
			compactEmpty
		/>
		<PageControls total={total} {...pagination} />
	</section>
);
import { Link } from "@tanstack/react-router";
