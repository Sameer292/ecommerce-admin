import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AdminForm } from "@/components/admin/admin-form";
import { DataTable } from "@/components/admin/data-table";
import { NotesField, TextField } from "@/components/admin/form-fields";
import { FormSection } from "@/components/admin/form-section";
import type { Column, ListPage, TableSorting } from "@/components/admin/list.types";
import { PageControls } from "@/components/admin/page-controls";
import type { Product } from "@/features/catalog/catalog.types";
import { StockStatus } from "@/features/catalog/product-labels";
import { formatCount, formatDateTime } from "@/lib/format";
import { writeStock } from "./inventory.functions";
import type { StockHistoryRow } from "./inventory.types";

export const StockSummary = ({ product }: { product: Product }) => (
	<FormSection
		title="Stock levels"
		description={`Low-stock threshold: ${formatCount(product.lowStockThreshold)}`}
	>
		<div className="flex flex-wrap items-center gap-4">
			<span className="font-heading text-4xl font-semibold tracking-tight">
				{formatCount(product.stock - product.reservedStock - product.damagedStock)} available
			</span>
			<StockStatus
				stock={product.stock - product.reservedStock - product.damagedStock}
				lowStockThreshold={product.lowStockThreshold}
			/>
		</div>
		<dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
			{[
				["On hand", product.stock],
				["Reserved", product.reservedStock],
				["Incoming", product.incomingStock],
				["Damaged", product.damagedStock],
			].map(([label, quantity]) => (
				<div key={label}>
					<dt className="text-muted-foreground">{label}</dt>
					<dd className="font-medium tabular-nums">{formatCount(Number(quantity))}</dd>
				</div>
			))}
		</dl>
	</FormSection>
);

type AdjustmentFormProps = { productId: string; adjustmentId: string };

const AdjustmentFields = ({ productId, adjustmentId }: AdjustmentFormProps) => (
	<>
		<input type="hidden" name="id" value={adjustmentId} />
		<input type="hidden" name="productId" value={productId} />
		<TextField
			name="delta"
			label="Change in units"
			type="number"
			min={-1000000}
			max={1000000}
			required
			hint="Enter a positive number to add stock or a negative number to remove it."
		/>
		<NotesField name="reason" label="Reason" maxLength={500} required />
		<TextField
			name="reference"
			label="Reference"
			maxLength={120}
			hint="Optional order, return, receipt, or stocktake reference."
		/>
	</>
);

export const AdjustStockForm = (props: AdjustmentFormProps) => {
	const submit = useServerFn(writeStock);
	const router = useRouter();
	return (
		<FormSection
			title="Adjust stock"
			description="Record a receiving, count, damage, or other inventory adjustment."
		>
			<AdminForm
				onSave={(data) => submit({ data })}
				onSuccess={() => router.invalidate()}
				submitLabel="Record adjustment"
				successMessage="Stock adjustment recorded."
			>
				<AdjustmentFields {...props} />
			</AdminForm>
		</FormSection>
	);
};

const stockColumns = (zone: string): Column<StockHistoryRow>[] => [
	{
		label: "Date and time",
		sort: "date.desc",
		compact: true,
		cell: (row) => (
			<time dateTime={row.createdAt.toISOString()}>{formatDateTime(row.createdAt, zone)}</time>
		),
	},
	{
		label: "Change",
		sort: "change.desc",
		compact: true,
		className: "text-right tabular-nums",
		cell: (row) => (row.delta > 0 ? "+" : "") + formatCount(row.delta),
	},
	{
		label: "On hand before and after",
		className: "tabular-nums",
		cell: (row) =>
			row.before && row.after
				? `${formatCount(row.before.stock)} → ${formatCount(row.after.stock)}`
				: "Unavailable",
	},
	{
		label: "Reason",
		cell: (row) => (
			<>
				<span>{row.reason}</span>
				{row.reference && (
					<span className="block text-xs text-muted-foreground wrap-anywhere">{row.reference}</span>
				)}
			</>
		),
	},
	{ label: "Changed by", sort: "staff.asc", cell: (row) => row.staffName ?? "System" },
];

export const StockHistory = ({
	rows,
	total,
	page,
	zone,
	onPage,
	sorting,
}: ListPage<StockHistoryRow> & {
	page: number;
	zone: string;
	onPage: (page: number) => void;
	sorting: TableSorting;
}) => (
	<section className="flex flex-col gap-4" aria-labelledby="stock-history">
		<h2 id="stock-history" className="font-heading text-xl font-semibold">
			Adjustment history
		</h2>
		<p className="text-sm text-muted-foreground">Times shown in {zone}.</p>
		<DataTable
			rows={rows}
			columns={stockColumns(zone)}
			sorting={sorting}
			label="Adjustment history"
			empty="No adjustments yet"
			compactEmpty
		/>
		<PageControls total={total} page={page} onPage={onPage} />
	</section>
);
