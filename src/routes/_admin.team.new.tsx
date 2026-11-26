import { listReturnSearchSchema } from "@/lib/list-return";
import { createFileRoute } from "@tanstack/react-router";
import { DetailHeading } from "@/components/admin/detail-heading";
import { NewStaffForm } from "@/features/team/team-form";

const NewStaffPage = () => (
	<>
		<DetailHeading
			title="Invite staff member"
			description="Assign a role and send a link to set a password."
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
