import { listReturnSearchSchema } from "@/lib/list-return";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { DetailHeading } from "@/components/admin/detail-heading";
import { can } from "@/features/auth/permissions";
import { CustomerForm } from "@/features/customers/customer-form";

const NewCustomerPage = () => (
	<>
		<DetailHeading
			title="Add customer"
			description="Create a record for a customer."
			back="/customers"
			backLabel="Customers"
		/>
		<CustomerForm editable />
	</>
);

export const Route = createFileRoute("/_admin/customers/new")({
	validateSearch: listReturnSearchSchema,
	beforeLoad: ({ context }) => {
		if (!can(context.staff.role, "manageCommerce")) throw redirect({ to: "/customers" });
	},
	component: NewCustomerPage,
});
