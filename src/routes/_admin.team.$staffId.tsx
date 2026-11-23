import { createFileRoute } from "@tanstack/react-router";
import { DetailHeading } from "@/components/admin/detail-heading";
import { StaffAccessForm } from "@/features/team/team-form";
import { readStaffAccount } from "@/features/team/team.functions";

const StaffPage = () => {
	const account = Route.useLoaderData();
	return (
		<>
			<DetailHeading
				title={account.name}
				description={account.email}
				back="/team"
				backLabel="Team"
			/>
			<StaffAccessForm key={account.id} account={account} />
		</>
	);
};

export const Route = createFileRoute("/_admin/team/$staffId")({
	loader: ({ params }) => readStaffAccount({ data: { id: params.staffId } }),
	component: StaffPage,
});
