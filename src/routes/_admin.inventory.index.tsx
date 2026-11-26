import { redirectInvalidPages } from "@/lib/pagination-redirect";
import { pageSearchDefaults } from "@/lib/pagination";
import { createFileRoute, Link, stripSearchParams } from "@tanstack/react-router";
import { PageHeading } from "@/components/admin/page-heading";
import { buttonVariants } from "@/components/ui/button";
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
			>
				<Link
					to="/inventory/replenishment"
					search={{ page: 1 }}
					className={buttonVariants({ variant: "outline" })}
				>
					Replenishment alerts
				</Link>
			</PageHeading>
			<InventoryList {...data} search={search} onSearch={(search) => navigate({ search })} />
		</>
	);
};

export const Route = createFileRoute("/_admin/inventory/")({
	validateSearch: inventorySearchSchema,
	search: { middlewares: [stripSearchParams(pageSearchDefaults)] },
	loaderDeps: ({ search }) => search,
	loader: async ({ context: { queryClient }, deps, location }) => {
		const data = await queryClient.fetchQuery({
			queryKey: ["inventory", deps],
			queryFn: ({ signal }) => readInventory({ data: deps, signal }),
		});
		redirectInvalidPages(location.pathname, { ...location.search, ...deps }, data.total);
		return data;
	},
	component: InventoryPage,
});
