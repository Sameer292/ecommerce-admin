import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";

export const NewRecord = ({ to, label }: { to: LinkProps["to"]; label: string }) => (
	<Link to={to} className={buttonVariants({ size: "lg" })}>
		<HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
		{label}
	</Link>
);
