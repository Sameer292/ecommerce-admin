import { pageSearchDefaults } from "@/lib/pagination";
import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { PageHeading } from "@/components/admin/page-heading";
import { InventoryList } from "@/features/inventory/inventory-list";
import { inventorySearchSchema } from "@/features/inventory/inventory-validation";
import { readInventory } from "@/features/inventory/inventory.functions";

const InventoryPage = () => {
	const data = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	return (
		<>
			<PageHeading
				title="Inventory"
				description="Track stock, spot low quantities, and review adjustments."
			/>
			<InventoryList {...data} search={search} onSearch={(search) => navigate({ search })} />
		</>
	);
};

export const Route = createFileRoute("/_admin/inventory/")({
	validateSearch: inventorySearchSchema,
	search: { middlewares: [stripSearchParams(pageSearchDefaults)] },
	loaderDeps: ({ search }) => search,
	loader: ({ context: { queryClient }, deps }) =>
		queryClient.fetchQuery({
			queryKey: ["inventory", deps],
			queryFn: ({ signal }) => readInventory({ data: deps, signal }),
		}),
	component: InventoryPage,
});
