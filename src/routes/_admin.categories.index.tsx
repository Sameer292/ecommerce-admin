import { pageSearchDefaults } from "@/lib/pagination";
import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { ListControls } from "@/components/admin/list-controls";
import { NewRecord } from "@/components/admin/new-record";
import { PageControls } from "@/components/admin/page-controls";
import { listSorting } from "@/components/admin/table-sorting";
import { PageHeading } from "@/components/admin/page-heading";
import { can } from "@/features/auth/permissions";
import { readCategories } from "@/features/catalog/categories.functions";
import { categorySearchSchema } from "@/features/catalog/catalog-validation";
import { CategoryTable } from "@/features/catalog/category-table";

const CategoryList = () => {
	const { rows, total } = Route.useLoaderData();
	const search = Route.useSearch();
	const { q, page, sort } = search;
	const navigate = Route.useNavigate();
	const update = (next: typeof search) => navigate({ search: next });
	return (
		<div className="flex flex-col gap-4">
			<ListControls
				search={search}
				placeholder="Search categories"
				readSearch={(form) => categorySearchSchema.parse(Object.fromEntries(form))}
				onSearch={update}
				onClear={q ? () => update({ q: "", page: 1, sort }) : undefined}
			/>
			<CategoryTable
				sorting={listSorting(search, "name.asc", categorySearchSchema, update)}
				rows={rows}
				filtered={Boolean(q || page > 1)}
			/>
			<PageControls page={page} total={total} onPage={(page) => update({ ...search, page })} />
		</div>
	);
};

const CategoriesPage = () => {
	const { staff } = Route.useRouteContext();
	return (
		<>
			<PageHeading
				title="Categories"
				description="Organize products into groups your storefront can use."
			>
				{can(staff.role, "manageCommerce") && (
					<NewRecord to="/categories/new" label="Add category" />
				)}
			</PageHeading>
			<CategoryList />
		</>
	);
};

export const Route = createFileRoute("/_admin/categories/")({
	validateSearch: categorySearchSchema,
	search: { middlewares: [stripSearchParams(pageSearchDefaults)] },
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => readCategories({ data: deps }),
	component: CategoriesPage,
});
