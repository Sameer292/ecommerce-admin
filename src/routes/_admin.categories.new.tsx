import { createFileRoute, redirect } from "@tanstack/react-router";
import { DetailHeading } from "@/components/admin/detail-heading";
import { can } from "@/features/auth/permissions";
import { CategoryForm } from "@/features/catalog/category-form";

const NewCategoryPage = () => (
	<>
		<DetailHeading
			title="Add category"
			description="Create a group for related products."
			back="/categories"
			backLabel="Categories"
		/>
		<CategoryForm editable />
	</>
);

export const Route = createFileRoute("/_admin/categories/new")({
	beforeLoad: ({ context }) => {
		if (!can(context.staff.role, "manageCommerce")) throw redirect({ to: "/categories" });
	},
	component: NewCategoryPage,
});
