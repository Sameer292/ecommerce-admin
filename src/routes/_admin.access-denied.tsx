import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeading } from "@/components/admin/page-heading";
import { buttonVariants } from "@/components/ui/button";

const AccessDenied = () => (
	<>
		<PageHeading
			title="Access denied"
			description="Your staff role does not have access to this page."
		/>
		<div>
			<Link to="/dashboard" className={buttonVariants({ variant: "outline" })}>
				Back to dashboard
			</Link>
		</div>
	</>
);

export const Route = createFileRoute("/_admin/access-denied")({ component: AccessDenied });
