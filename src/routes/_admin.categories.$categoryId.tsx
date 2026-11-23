import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { DeleteRecord } from "@/components/admin/delete-record";
import { DetailHeading } from "@/components/admin/detail-heading";
import { can } from "@/features/auth/permissions";
import { readCategory, removeCategory } from "@/features/catalog/categories.functions";
import { CategoryForm } from "@/features/catalog/category-form";

const CategoryPage = () => {
	const category = Route.useLoaderData();
	const { staff } = Route.useRouteContext();
	const editable = can(staff.role, "manageCommerce");
	const navigate = Route.useNavigate();
	const remove = useServerFn(removeCategory);

	return (
		<>
			<DetailHeading
				title={category.name}
				description="Category details"
				back="/categories"
				backLabel="Categories"
			>
				{editable && (
					<DeleteRecord
						id={category.id}
						record="category"
						onDelete={(data) => remove({ data })}
						onSuccess={() => navigate({ to: "/categories" })}
					/>
				)}
			</DetailHeading>
			<CategoryForm key={category.id} category={category} editable={editable} />
		</>
	);
};

export const Route = createFileRoute("/_admin/categories/$categoryId")({
	loader: ({ params }) => readCategory({ data: { id: params.categoryId } }),
	component: CategoryPage,
});
