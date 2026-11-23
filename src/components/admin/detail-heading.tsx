import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageHeading } from "./page-heading";

type DetailHeadingProps = {
	title: string;
	description: string;
	back: LinkProps["to"];
	backLabel: string;
	children?: ReactNode;
};

export const DetailHeading = ({
	title,
	description,
	back,
	backLabel,
	children,
}: DetailHeadingProps) => (
	<div className="flex flex-col items-start gap-3">
		<Link className={cn(buttonVariants({ variant: "ghost" }), "-ml-2.5")} to={back}>
			<HugeiconsIcon icon={ArrowLeft01Icon} data-icon="inline-start" />
			{backLabel}
		</Link>
		<div className="w-full">
			<PageHeading title={title} description={description}>
				{children}
			</PageHeading>
		</div>
	</div>
);
