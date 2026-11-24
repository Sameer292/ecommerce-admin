import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cn } from "cn";

export const Popover = (props: PopoverPrimitive.Root.Props) => (
	<PopoverPrimitive.Root data-slot="popover" {...props} />
);

export const PopoverTrigger = (props: PopoverPrimitive.Trigger.Props) => (
	<PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
);

export const PopoverClose = (props: PopoverPrimitive.Close.Props) => (
	<PopoverPrimitive.Close data-slot="popover-close" {...props} />
);

export const PopoverTitle = ({ className, ...props }: PopoverPrimitive.Title.Props) => (
	<PopoverPrimitive.Title
		data-slot="popover-title"
		className={cn("font-medium", className)}
		{...props}
	/>
);

export const PopoverContent = ({
	className,
	align = "center",
	sideOffset = 4,
	...props
}: PopoverPrimitive.Popup.Props &
	Pick<PopoverPrimitive.Positioner.Props, "align" | "sideOffset">) => (
	<PopoverPrimitive.Portal>
		<PopoverPrimitive.Positioner align={align} sideOffset={sideOffset} className="isolate z-50">
			<PopoverPrimitive.Popup
				data-slot="popover-content"
				className={cn(
					"flex w-72 flex-col gap-2.5 rounded-lg bg-popover p-2.5 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden",
					className,
				)}
				{...props}
			/>
		</PopoverPrimitive.Positioner>
	</PopoverPrimitive.Portal>
);
