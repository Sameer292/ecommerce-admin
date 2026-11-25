import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { OrderSearch } from "@/features/orders/order.types";
import { formatCount } from "@/lib/format";

const orderQueues: {
	key: "fulfillment" | "overdue" | "tracking" | "returns";
	title: string;
	search: Partial<OrderSearch>;
}[] = [
	{ key: "fulfillment", title: "Ready for fulfillment", search: { view: "to_fulfill" } },
	{ key: "overdue", title: "Unpaid over 48 hours", search: { view: "overdue_unpaid" } },
	{ key: "tracking", title: "Missing tracking", search: { shipping: "missing_tracking" } },
	{ key: "returns", title: "Open returns", search: { view: "open_returns" } },
];

const tile = "flex flex-col justify-between gap-1 rounded-lg border p-3 text-sm hover:bg-muted/50";

export const WorkQueue = ({
	counts,
}: {
	counts: Record<(typeof orderQueues)[number]["key"] | "syncFailures", number>;
}) => (
	<Card size="sm">
		<CardHeader>
			<h2 className="font-heading text-lg font-semibold">Order work queue</h2>
		</CardHeader>
		<CardContent className="grid grid-cols-2 gap-2 lg:grid-cols-5">
			{orderQueues.map(({ key, title, search }) => (
				<Link key={key} to="/orders" search={{ page: 1, q: "", ...search }} className={tile}>
					<span>{title}</span>
					<strong className="text-lg tabular-nums">{formatCount(counts[key])}</strong>
				</Link>
			))}
			<Link to="/orders/synchronization" search={{ page: 1 }} className={tile}>
				<span>Synchronization failures</span>
				<strong className="text-lg tabular-nums">{formatCount(counts.syncFailures)}</strong>
			</Link>
		</CardContent>
	</Card>
);
