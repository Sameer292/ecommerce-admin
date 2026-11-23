import { pageSearchDefaults } from "@/lib/pagination";
import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { NewRecord } from "@/components/admin/new-record";
import { PageHeading } from "@/components/admin/page-heading";
import { TeamList } from "@/features/team/team-list";
import { readTeam } from "@/features/team/team.functions";
import { pageSearchSchema } from "@/lib/pagination";

const TeamPage = () => {
	const data = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	return (
		<>
			<PageHeading title="Team" description="Create staff accounts and manage their access.">
				<NewRecord to="/team/new" label="Add staff member" />
			</PageHeading>
			<TeamList {...data} search={search} onSearch={(search) => navigate({ search })} />
		</>
	);
};

export const Route = createFileRoute("/_admin/team/")({
	validateSearch: pageSearchSchema,
	search: { middlewares: [stripSearchParams(pageSearchDefaults)] },
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => readTeam({ data: deps }),
	component: TeamPage,
});
