import { createFileRoute } from "@tanstack/react-router";
import { PageHeading } from "@/components/admin/page-heading";

const OverviewPage = () => (
	<PageHeading
		title="Overview"
		description="Manage your store from one workspace."
	/>
);

export const Route = createFileRoute("/_admin/")({ component: OverviewPage });
