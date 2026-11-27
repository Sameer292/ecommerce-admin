import { useListReturn } from "@/components/admin/record-link";
import { listReturnSearchSchema } from "@/lib/list-return";
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
	const returnHref = useListReturn("/categories");
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
						name={category.name}
						blockedReason={
							category.productCount > 0
								? "Move its products to another category before deleting this category."
								: undefined
						}
						onDelete={(data) => remove({ data })}
						onSuccess={() => navigate({ href: returnHref })}
					/>
				)}
			</DetailHeading>
			<CategoryForm key={category.id} category={category} editable={editable} />
		</>
	);
};

export const Route = createFileRoute("/_admin/categories/$categoryId")({
	validateSearch: listReturnSearchSchema,
	loader: ({ context: { queryClient }, params }) =>
		queryClient.query({
			queryKey: ["category", params.categoryId],
			queryFn: ({ signal }) => readCategory({ data: { id: params.categoryId }, signal }),
		}),
	component: CategoryPage,
});
