import { listReturnSearchSchema } from "@/lib/list-return";
import { createFileRoute } from "@tanstack/react-router";
import { DetailHeading } from "@/components/admin/detail-heading";
import { NewStaffForm } from "@/features/team/team-form";

const NewStaffPage = () => (
	<>
		<DetailHeading
			title="Add staff member"
			description="Create an account and assign a role."
			back="/team"
			backLabel="Team"
		/>
		<NewStaffForm />
	</>
);

export const Route = createFileRoute("/_admin/team/new")({
	validateSearch: listReturnSearchSchema,
	component: NewStaffPage,
});
