import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "cn";

export const TooltipProvider = (props: TooltipPrimitive.Provider.Props) => (
	<TooltipPrimitive.Provider {...props} />
);

export const Tooltip = (props: TooltipPrimitive.Root.Props) => <TooltipPrimitive.Root {...props} />;

export const TooltipTrigger = (props: TooltipPrimitive.Trigger.Props) => (
	<TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
);

export const TooltipContent = ({ className, ...props }: TooltipPrimitive.Popup.Props) => (
	<TooltipPrimitive.Portal>
		<TooltipPrimitive.Positioner sideOffset={4} className="isolate z-50">
			<TooltipPrimitive.Popup
				data-slot="tooltip-content"
				className={cn(
					"w-fit max-w-xs rounded-md bg-foreground px-3 py-1.5 text-xs text-background",
					className,
				)}
				{...props}
			/>
		</TooltipPrimitive.Positioner>
	</TooltipPrimitive.Portal>
);
