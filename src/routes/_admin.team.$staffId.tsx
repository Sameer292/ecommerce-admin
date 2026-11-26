import { listReturnSearchSchema } from "@/lib/list-return";
import { createFileRoute } from "@tanstack/react-router";
import { DetailHeading } from "@/components/admin/detail-heading";
import { OwnershipTransfer, StaffAccessForm } from "@/features/team/team-form";
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
			{account.role !== "superuser" &&
				account.linked &&
				!account.passwordPending &&
				!account.banned && <OwnershipTransfer account={account} />}
		</>
	);
};

export const Route = createFileRoute("/_admin/team/$staffId")({
	validateSearch: listReturnSearchSchema,
	loader: ({ context: { queryClient }, params }) =>
		queryClient.fetchQuery({
			queryKey: ["staff-account", params.staffId],
			queryFn: ({ signal }) => readStaffAccount({ data: { id: params.staffId }, signal }),
		}),
	component: StaffPage,
});
