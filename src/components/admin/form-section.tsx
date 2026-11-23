import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";

export const FormSection = ({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: ReactNode;
}) => (
	<Card size="sm" className="gap-5 p-5">
		<CardHeader className="px-0">
			<h2 className="font-heading text-base font-semibold">{title}</h2>
			{description && <CardDescription>{description}</CardDescription>}
		</CardHeader>
		<CardContent className="px-0">
			<FieldGroup>{children}</FieldGroup>
		</CardContent>
	</Card>
);
