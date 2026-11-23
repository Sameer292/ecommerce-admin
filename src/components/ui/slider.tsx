import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "cn";

type SliderProps<Value extends number | readonly number[]> = SliderPrimitive.Root.Props<Value> &
	Pick<SliderPrimitive.Thumb.Props, "getAriaLabel" | "getAriaValueText">;

const SliderThumb = ({
	index,
	...labels
}: Pick<SliderPrimitive.Thumb.Props, "index" | "getAriaLabel" | "getAriaValueText">) => (
	<SliderPrimitive.Thumb
		index={index}
		data-slot="slider-thumb"
		{...labels}
		className="relative block size-3 shrink-0 rounded-full border border-ring bg-background ring-ring/50 transition-[color,box-shadow] select-none after:absolute after:-inset-2 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 disabled:pointer-events-none disabled:opacity-50"
	/>
);

const SliderTrack = () => (
	<SliderPrimitive.Track
		data-slot="slider-track"
		className="relative grow overflow-hidden rounded-full bg-muted select-none data-horizontal:h-1 data-horizontal:w-full data-vertical:h-full data-vertical:w-1"
	>
		<SliderPrimitive.Indicator
			data-slot="slider-range"
			className="bg-primary select-none data-horizontal:h-full data-vertical:w-full"
		/>
	</SliderPrimitive.Track>
);

type SliderControlProps = Pick<SliderPrimitive.Thumb.Props, "getAriaLabel" | "getAriaValueText"> & {
	count: number;
};

const SliderControl = ({ count, ...labels }: SliderControlProps) => (
	<SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col">
		<SliderTrack />
		{Array.from({ length: count }, (_, index) => index).map((index) => (
			<SliderThumb key={index} index={index} {...labels} />
		))}
	</SliderPrimitive.Control>
);

export const Slider = <Value extends number | readonly number[]>({
	className,
	value,
	defaultValue,
	getAriaLabel,
	getAriaValueText,
	...props
}: SliderProps<Value>) => {
	const values = value ?? defaultValue;
	const count = Array.isArray(values) ? values.length : 1;
	return (
		<SliderPrimitive.Root
			data-slot="slider"
			value={value}
			defaultValue={defaultValue}
			thumbAlignment="edge"
			className={cn("data-horizontal:w-full data-vertical:h-full", className)}
			{...props}
		>
			<SliderControl
				count={count}
				getAriaLabel={getAriaLabel}
				getAriaValueText={getAriaValueText}
			/>
		</SliderPrimitive.Root>
	);
};
