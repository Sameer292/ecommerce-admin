import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AdminForm } from "@/components/admin/admin-form";
import { DataTable } from "@/components/admin/data-table";
import { NotesField, SelectField, TextField } from "@/components/admin/form-fields";
import { FormSection } from "@/components/admin/form-section";
import type { Column, ListPage, TableSorting } from "@/components/admin/list.types";
import { PageControls, type PageControlsProps } from "@/components/admin/page-controls";
import type { Product } from "@/features/catalog/catalog.types";
import { StockStatus } from "@/features/catalog/product-labels";
import { formatCount, formatDateTime } from "@/lib/format";
import { writeStock } from "./inventory.functions";
import type { StockHistoryRow } from "./inventory.types";
import {
	adjustmentKinds,
	adjustmentLabels,
	availableUnits,
	projectStock,
	type AdjustmentKind,
	stockLevelsValid,
	stockLevelVersion,
} from "./stock-adjustment";

export const StockSummary = ({ product }: { product: Product }) => (
	<FormSection title="Stock levels">
		<div className="flex flex-wrap items-center gap-4">
			<span className="font-heading text-4xl font-semibold tracking-tight">
				{formatCount(availableUnits(product))} available
			</span>
			<StockStatus stock={availableUnits(product)} />
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

type AdjustmentFormProps = { product: Product; adjustmentId: string };

const AdjustmentFields = ({ product, adjustmentId }: AdjustmentFormProps) => {
	const [kind, setKind] = useState<AdjustmentKind>("correction");
	const [quantity, setQuantity] = useState("");
	const projected = /^-?\d+$/.test(quantity) ? projectStock(product, kind, Number(quantity)) : null;
	return (
		<>
			<input type="hidden" name="id" value={adjustmentId} />
			<input type="hidden" name="productId" value={product.id} />
			<input type="hidden" name="base" value={stockLevelVersion(product)} />
			<SelectField
				name="kind"
				label="Adjustment type"
				value={kind}
				onValueChange={(value) => {
					const selected = adjustmentKinds.find((entry) => entry === value);
					if (selected) setKind(selected);
				}}
				items={adjustmentKinds.map((value) => ({ value, label: adjustmentLabels[value] }))}
			/>
			<TextField
				name="quantity"
				label={kind === "correction" ? "Change in units" : "Quantity"}
				type="number"
				min={kind === "correction" ? -1_000_000 : kind === "receiving" ? 1 : 0}
				max={kind === "correction" ? 1_000_000 : 2_147_483_647}
				value={quantity}
				onChange={(event) => setQuantity(event.currentTarget.value)}
				required
				hint={
					kind === "correction"
						? "Enter a positive number to add stock or a negative number to remove it."
						: undefined
				}
			/>
			<div role="status" className="text-sm text-muted-foreground">
				{projected &&
					(stockLevelsValid(projected) ? (
						<>
							<p>
								On hand {formatCount(product.stock)} → {formatCount(projected.stock)} units
							</p>
							<p>
								Available {formatCount(availableUnits(product))} →{" "}
								{formatCount(availableUnits(projected))} units
							</p>
							{projected.incomingStock !== product.incomingStock && (
								<p>
									Incoming {formatCount(product.incomingStock)} →{" "}
									{formatCount(projected.incomingStock)} units
								</p>
							)}
							{projected.damagedStock !== product.damagedStock && (
								<p>
									Damaged {formatCount(product.damagedStock)} →{" "}
									{formatCount(projected.damagedStock)} units
								</p>
							)}
						</>
					) : (
						<p className="text-destructive">Projected stock is outside the allowed range.</p>
					))}
			</div>
			<NotesField name="reason" label="Reason" maxLength={500} required />
			<TextField
				name="reference"
				label="Reference"
				maxLength={120}
				hint="Optional order, return, receipt, or stocktake reference."
			/>
		</>
	);
};

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
		cell: (row) => {
			const kind = adjustmentKinds.find((entry) => entry === row.kind);
			return (
				<>
					{kind && <p className="font-medium">{adjustmentLabels[kind]}</p>}
					<span>{row.reason}</span>
					{row.reference && (
						<span className="block text-xs text-muted-foreground wrap-anywhere">
							{row.reference}
						</span>
					)}
				</>
			);
		},
	},
	{ label: "Changed by", sort: "staff.asc", cell: (row) => row.staffName ?? "System" },
];

export const StockHistory = ({
	rows,
	total,
	zone,
	pagination,
	sorting,
}: ListPage<StockHistoryRow> & {
	zone: string;
	pagination: Omit<PageControlsProps, "total">;
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
		<PageControls total={total} {...pagination} />
	</section>
);
