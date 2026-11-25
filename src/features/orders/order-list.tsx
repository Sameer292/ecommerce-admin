import { ClearFilters } from "@/components/admin/data-table";
import { listSorting } from "@/components/admin/table-sorting";
import { SelectField, TextField } from "@/components/admin/form-fields";
import { currencyDigits, moneyInput } from "@/lib/format";
import { ListControls } from "@/components/admin/list-controls";
import type { ListPage } from "@/components/admin/list.types";
import { ListPagination } from "@/components/admin/page-controls";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
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

const OrderFilters = ({
	search,
	onSearch,
	currency,
	zone,
}: Pick<OrderListProps, "search" | "onSearch" | "currency" | "zone">) => (
	<ListControls
		search={search}
		placeholder="Search orders or customers"
		readSearch={(form) => readOrderFilters(form, currency)}
		onSearch={onSearch}
		onClear={hasOrderFilters(search) ? () => onSearch(clearOrders(search)) : undefined}
	>
		<NativeSelect name="status" aria-label="Order status" defaultValue={search.status ?? ""}>
			<NativeSelectOption value="">All statuses</NativeSelectOption>
			{orderStatuses.map((status) => (
				<NativeSelectOption key={status} value={status}>
					{orderStatusLabels[status]}
				</NativeSelectOption>
			))}
		</NativeSelect>
		<NativeSelect name="payment" aria-label="Payment status" defaultValue={search.payment ?? ""}>
			<NativeSelectOption value="">All payments</NativeSelectOption>
			{paymentStatuses.map((status) => (
				<NativeSelectOption key={status} value={status}>
					{paymentStatusLabels[status]}
				</NativeSelectOption>
			))}
		</NativeSelect>
		<NativeSelect name="view" aria-label="Order view" defaultValue={search.view ?? ""}>
			<NativeSelectOption value="">All orders</NativeSelectOption>
			<NativeSelectOption value="paid_to_fulfill">Paid and awaiting fulfillment</NativeSelectOption>
			<NativeSelectOption value="overdue_unpaid">Unpaid for over 48 hours</NativeSelectOption>
		</NativeSelect>
		<details className="w-full rounded-lg border bg-card p-3 text-sm">
			<summary className="cursor-pointer font-medium">Date, total and shipping filters</summary>
			<div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				<SelectField name="shipping" label="Shipping state" defaultValue={search.shipping ?? ""}>
					<NativeSelectOption value="">All shipping states</NativeSelectOption>
					<NativeSelectOption value="awaiting_dispatch">Awaiting dispatch</NativeSelectOption>
					<NativeSelectOption value="in_transit">In transit</NativeSelectOption>
					<NativeSelectOption value="delivered">Delivered</NativeSelectOption>
					<NativeSelectOption value="missing_tracking">Shipped without tracking</NativeSelectOption>
				</SelectField>
				<TextField
					name="placedFrom"
					type="date"
					label="Placed from"
					defaultValue={search.placedFrom}
					hint={zone}
				/>
				<TextField
					name="placedThrough"
					type="date"
					label="Placed through"
					defaultValue={search.placedThrough}
					hint={zone}
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
			</div>
		</details>
	</ListControls>
);

export const OrderList = ({ rows, total, search, currency, zone, onSearch }: OrderListProps) => (
	<div className="flex flex-col gap-4">
		<OrderFilters search={search} onSearch={onSearch} currency={currency} zone={zone} />
		<ListPagination total={total} search={search} onSearch={onSearch} />
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
		<ListPagination total={total} search={search} onSearch={onSearch} bottom />
	</div>
);
