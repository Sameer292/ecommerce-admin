import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { LinkProps } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";
import { RecordLink } from "./record-link";

export const NewRecord = ({ to, label }: { to: LinkProps["to"]; label: string }) => (
	<RecordLink to={to} className={buttonVariants({ size: "lg" })}>
		<HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
		{label}
	</RecordLink>
);
