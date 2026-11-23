import type { ComponentProps } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const tones = {
	neutral: "border-border bg-muted/50 text-muted-foreground",
	success: "border-success/20 bg-success/10 text-success",
	warning: "border-warning/20 bg-warning/10 text-warning",
	danger: "border-destructive/20 bg-destructive/10 text-destructive",
} as const;

export const StatusBadge = ({
	tone = "neutral",
	className,
	children,
}: ComponentProps<typeof Badge> & {
	tone?: keyof typeof tones;
}) => (
	<Badge variant="outline" className={cn("gap-1.5 px-2 py-0.5 text-xs", tones[tone], className)}>
		<span className="size-1.5 rounded-full bg-current" aria-hidden />
		{children}
	</Badge>
);
