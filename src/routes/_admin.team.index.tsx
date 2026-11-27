import { redirectInvalidPages } from "@/lib/pagination-redirect";
import { pageSearchDefaults } from "@/lib/pagination";
import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { NewRecord } from "@/components/admin/new-record";
import { PageHeading } from "@/components/admin/page-heading";
import { TeamList } from "@/features/team/team-list";
import { readTeam } from "@/features/team/team.functions";
import { teamSearchSchema } from "@/features/team/team-validation";

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
	validateSearch: teamSearchSchema,
	search: { middlewares: [stripSearchParams(pageSearchDefaults)] },
	loaderDeps: ({ search }) => search,
	loader: async ({ context: { queryClient }, deps, location }) => {
		const data = await queryClient.query({
			queryKey: ["team", deps],
			queryFn: ({ signal }) => readTeam({ data: deps, signal }),
		});
		redirectInvalidPages(location.pathname, { ...location.search, ...deps }, data.total);
		return data;
	},
	component: TeamPage,
});
