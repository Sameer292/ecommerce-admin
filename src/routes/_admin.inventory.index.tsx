import { createFileRoute } from "@tanstack/react-router";
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
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => readInventory({ data: deps }),
	component: InventoryPage,
});
