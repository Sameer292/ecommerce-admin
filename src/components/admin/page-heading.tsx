import type { ReactNode } from "react";

export const PageHeading = ({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children?: ReactNode;
}) => (
	<header className="flex flex-wrap items-end justify-between gap-4">
		<div className="flex min-w-0 flex-col gap-1.5">
			<h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
			<p className="text-sm text-muted-foreground sm:text-base">{description}</p>
		</div>
		{children}
	</header>
);
