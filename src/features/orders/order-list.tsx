import { Cancel01Icon, FilterIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState, type SubmitEvent } from "react";
import { ClearFilters } from "@/components/admin/data-table";
import { listSorting } from "@/components/admin/table-sorting";
import { FilterSelect, FormField, TextField } from "@/components/admin/form-fields";
import { currencyDigits, moneyInput } from "@/lib/format";
import { ListControls } from "@/components/admin/list-controls";
import type { ListPage } from "@/components/admin/list.types";
import { ListPagination } from "@/components/admin/page-controls";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import {
	orderStatusLabels,
	orderStatuses,
	paymentStatusLabels,
	paymentStatuses,
} from "./order-options";
import { OrderTable } from "./order-table";
import { orderSearchSchema, readOrderFilters } from "./order-validation";
import type { OrderRow, OrderSearch } from "./order.types";

type OrderListProps = ListPage<OrderRow> & {
	search: OrderSearch;
	currency: string;
	zone: string;
	onSearch: (search: OrderSearch) => void;
};

const hasOrderFilters = ({ page: _page, perPage: _size, sort: _sort, ...filters }: OrderSearch) =>
	Object.values(filters).some((value) => value !== undefined && value !== "");

const clearOrders = ({ sort, perPage }: OrderSearch): OrderSearch => ({
	q: "",
	page: 1,
	sort,
	perPage,
});

const paymentOptions = [
	{ value: "", label: "All payments" },
	...paymentStatuses.map((value) => ({ value, label: paymentStatusLabels[value] })),
];

const statusOptions = [
	{ value: "", label: "All statuses" },
	...orderStatuses.map((value) => ({ value, label: orderStatusLabels[value] })),
];

const viewOptions = [
	{ value: "", label: "All orders" },
	{ value: "paid_to_fulfill", label: "Paid and awaiting fulfillment" },
	{ value: "to_fulfill", label: "Ready for fulfillment" },
	{ value: "overdue_unpaid", label: "Unpaid for over 48 hours" },
	{ value: "open_returns", label: "Open returns" },
];

const shippingOptions = [
	{ value: "", label: "All shipping states" },
	{ value: "awaiting_dispatch", label: "Awaiting dispatch" },
	{ value: "in_transit", label: "In transit" },
	{ value: "delivered", label: "Delivered" },
	{ value: "missing_tracking", label: "Missing tracking" },
];

type FilterFieldsProps = Pick<OrderListProps, "search" | "currency">;

const AdvancedOrderFields = ({
	search,
	currency,
	submitOnChange,
}: FilterFieldsProps & { submitOnChange?: boolean }) => (
	<>
		<FormField
			name="shipping"
			label="Shipping state"
			render={({ id }) => (
				<FilterSelect
					id={id}
					name="shipping"
					label="Shipping state"
					value={search.shipping}
					items={shippingOptions}
					className="w-full"
					submitOnChange={submitOnChange}
				/>
			)}
		/>
		<TextField name="placedFrom" type="date" label="Placed from" defaultValue={search.placedFrom} />
		<TextField
			name="placedThrough"
			type="date"
			label="Placed through"
			defaultValue={search.placedThrough}
		/>
		<TextField
			name="minTotal"
			type="number"
			min={0}
			step={10 ** -currencyDigits(currency)}
			label={`Minimum total (${currency})`}
			defaultValue={
				search.minTotalMinor === undefined ? "" : moneyInput(search.minTotalMinor, currency)
			}
		/>
		<TextField
			name="maxTotal"
			type="number"
			min={0}
			step={10 ** -currencyDigits(currency)}
			label={`Maximum total (${currency})`}
			defaultValue={
				search.maxTotalMinor === undefined ? "" : moneyInput(search.maxTotalMinor, currency)
			}
		/>
	</>
);

const OrderFilterSheet = ({
	search,
	currency,
	apply,
}: FilterFieldsProps & { apply: (fields: FormData) => boolean }) => {
	const [open, setOpen] = useState(false);
	const [invalid, setInvalid] = useState(false);
	const active = hasOrderFilters({ ...search, q: "" });
	const submit = (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();
		event.stopPropagation();
		if (apply(new FormData(event.currentTarget))) setOpen(false);
		else setInvalid(true);
	};
	return (
		<Sheet
			open={open}
			onOpenChange={(open) => {
				setOpen(open);
				setInvalid(false);
			}}
		>
			<SheetTrigger
				render={
					<Button
						type="button"
						variant="ghost"
						size="icon-lg"
						aria-label={active ? "Order filters (filters applied)" : "Order filters"}
					/>
				}
			>
				<HugeiconsIcon icon={FilterIcon} aria-hidden />
				{active && (
					<span
						aria-hidden
						className="absolute top-2 right-2 size-2 rounded-full bg-primary ring-2 ring-background"
					/>
				)}
			</SheetTrigger>
			<SheetContent
				side="bottom"
				showCloseButton={false}
				className="max-h-[85dvh] gap-0 overflow-hidden rounded-t-xl"
				onChange={(event) => event.stopPropagation()}
				onCompositionStart={(event) => event.stopPropagation()}
				onCompositionEnd={(event) => event.stopPropagation()}
			>
				<SheetHeader className="shrink-0 flex-row items-center justify-between gap-3 py-2">
					<SheetTitle>Date, total and shipping filters</SheetTitle>
					<SheetClose render={<Button variant="ghost" size="icon-sm" aria-label="Close" />}>
						<HugeiconsIcon icon={Cancel01Icon} aria-hidden />
					</SheetClose>
				</SheetHeader>
				<form
					onSubmit={submit}
					className="flex min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
				>
					<AdvancedOrderFields search={search} currency={currency} submitOnChange={false} />
					{invalid && (
						<p role="alert" className="text-destructive">
							Enter valid order totals.
						</p>
					)}
					<Button type="submit">Apply filters</Button>
				</form>
			</SheetContent>
		</Sheet>
	);
};

const OrderFilters = ({
	search,
	onSearch,
	currency,
}: Pick<OrderListProps, "search" | "onSearch" | "currency">) => (
	<ListControls
		search={search}
		placeholder="Search orders or customers"
		searchClassName="max-md:basis-full md:max-w-xs"
		mobileSearchAction={(apply) => (
			<OrderFilterSheet search={search} currency={currency} apply={apply} />
		)}
		readSearch={(form) => readOrderFilters(form, currency)}
		onSearch={onSearch}
		onClear={hasOrderFilters(search) ? () => onSearch(clearOrders(search)) : undefined}
	>
		<FilterSelect
			className="max-md:min-w-0 max-md:flex-1"
			name="payment"
			label="Payment status"
			value={search.payment}
			items={paymentOptions}
		/>
		<FilterSelect
			className="max-md:min-w-0 max-md:flex-1"
			name="status"
			label="Order status"
			value={search.status}
			items={statusOptions}
		/>
		<FilterSelect
			className="max-md:w-full"
			name="view"
			label="Order view"
			value={search.view}
			items={viewOptions}
		/>
		<details className="hidden w-full rounded-lg border bg-card p-3 text-sm md:block">
			<summary className="cursor-pointer font-medium">Date, total and shipping filters</summary>
			<div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				<AdvancedOrderFields search={search} currency={currency} />
			</div>
		</details>
	</ListControls>
);

export const OrderList = ({ rows, total, search, currency, zone, onSearch }: OrderListProps) => {
	return (
		<div className="flex flex-col gap-4">
			<OrderFilters search={search} onSearch={onSearch} currency={currency} />
			<OrderTable
				sorting={listSorting(search, "date.desc", orderSearchSchema, onSearch)}
				rows={rows}
				currency={currency}
				zone={zone}
				emptyAction={
					hasOrderFilters(search) ? (
						<ClearFilters onClear={() => onSearch(clearOrders(search))} />
					) : undefined
				}
				empty={hasOrderFilters(search) || search.page > 1 ? "No matching orders" : "No orders yet"}
			/>
			<ListPagination total={total} search={search} onSearch={onSearch} />
		</div>
	);
};
