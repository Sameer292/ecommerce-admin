import { ListControls } from "@/components/admin/list-controls";
import type { ListPage } from "@/components/admin/list.types";
import { PageControls } from "@/components/admin/page-controls";
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
		onClear={search.q || search.status ? () => onSearch({ q: "", page: 1 }) : undefined}
	>
		<NativeSelect
			name="status"
			aria-label="Order status"
			defaultValue={search.status ?? ""}
			className="h-9"
		>
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
		<OrderTable
			rows={rows}
			currency={currency}
			zone={zone}
			empty={search.q || search.status || search.page > 1 ? "No matching orders" : "No orders yet"}
		/>
		<PageControls
			total={total}
			page={search.page}
			onPage={(page) => onSearch({ ...search, page })}
		/>
	</div>
);
