import { Calendar01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { format, parseISO } from "date-fns";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FormField } from "./form-fields";

export const DateField = ({
	name,
	label,
	defaultValue = "",
	submitOnChange = true,
}: {
	name: string;
	label: string;
	defaultValue?: string;
	submitOnChange?: boolean;
}) => {
	const input = useRef<HTMLInputElement>(null);
	const [value, setValue] = useState(defaultValue);
	const [open, setOpen] = useState(false);
	const date = value ? parseISO(value) : undefined;
	const formatted = date ? format(date, "PPP") : undefined;
	const select = (selected?: Date) => {
		setValue(selected ? format(selected, "uuuu-MM-dd") : "");
		setOpen(false);
		if (submitOnChange) input.current?.form?.requestSubmit();
	};

	return (
		<FormField
			name={name}
			label={label}
			render={(field) => (
				<Popover open={open} onOpenChange={setOpen}>
					<input ref={input} type="hidden" name={name} value={value} />
					<PopoverTrigger
						render={
							<Button
								{...field}
								type="button"
								variant="outline"
								aria-label={formatted ? `${label}: ${formatted}` : label}
								data-empty={!date}
								className="w-full justify-start font-normal data-[empty=true]:text-muted-foreground"
							/>
						}
					>
						<HugeiconsIcon icon={Calendar01Icon} data-icon="inline-start" aria-hidden />
						{formatted ?? "Pick a date"}
					</PopoverTrigger>
					<PopoverContent align="start" className="w-auto max-w-(--available-width) gap-0 p-0">
						<Calendar
							className="max-[360px]:pointer-coarse:[&_button[data-day]]:min-h-10 max-[360px]:pointer-coarse:[&_button[data-day]]:min-w-10"
							mode="single"
							selected={date}
							defaultMonth={date}
							onSelect={select}
							autoFocus
						/>
						{date && (
							<Button type="button" variant="ghost" className="m-2 mt-0" onClick={() => select()}>
								Clear date
							</Button>
						)}
					</PopoverContent>
				</Popover>
			)}
		/>
	);
};
