import { ClearFilters } from "@/components/admin/data-table";
import { listSorting } from "@/components/admin/table-sorting";
import { ListControls } from "@/components/admin/list-controls";
import type { ListPage } from "@/components/admin/list.types";
import { ListPagination } from "@/components/admin/page-controls";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { orderStatusLabels, orderStatuses } from "./order-options";
import { OrderTable } from "./order-table";
import { orderSearchSchema } from "./order-validation";
import type { OrderRow, OrderSearch } from "./order.types";

type OrderListProps = ListPage<OrderRow> & {
	search: OrderSearch;
	currency: string;
	zone: string;
	onSearch: (search: OrderSearch) => void;
};

const OrderFilters = ({ search, onSearch }: Pick<OrderListProps, "search" | "onSearch">) => (
	<ListControls
		search={search}
		placeholder="Search orders or customers"
		readSearch={(form) => orderSearchSchema.parse(Object.fromEntries(form))}
		onSearch={onSearch}
		onClear={
			search.q || search.status
				? () => onSearch({ q: "", page: 1, sort: search.sort, perPage: search.perPage })
				: undefined
		}
	>
		<NativeSelect name="status" aria-label="Order status" defaultValue={search.status ?? ""}>
			<NativeSelectOption value="">All statuses</NativeSelectOption>
			{orderStatuses.map((status) => (
				<NativeSelectOption key={status} value={status}>
					{orderStatusLabels[status]}
				</NativeSelectOption>
			))}
		</NativeSelect>
	</ListControls>
);

export const OrderList = ({ rows, total, search, currency, zone, onSearch }: OrderListProps) => (
	<div className="flex flex-col gap-4">
		<OrderFilters search={search} onSearch={onSearch} />
		<ListPagination total={total} search={search} onSearch={onSearch} />
		<OrderTable
			sorting={listSorting(search, "date.desc", orderSearchSchema, onSearch)}
			rows={rows}
			currency={currency}
			zone={zone}
			emptyAction={
				search.q || search.status ? (
					<ClearFilters
						onClear={() => onSearch({ q: "", page: 1, sort: search.sort, perPage: search.perPage })}
					/>
				) : undefined
			}
			empty={search.q || search.status || search.page > 1 ? "No matching orders" : "No orders yet"}
		/>
		<ListPagination total={total} search={search} onSearch={onSearch} bottom />
	</div>
);
