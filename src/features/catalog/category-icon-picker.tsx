import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PopoverClose, PopoverContent, PopoverTitle } from "@/components/ui/popover";
import { categoryIcons } from "./catalog-options";
import type { Category } from "./catalog.types";
import { categoryIconOptions } from "./category-icon";

type IconSelection = {
	selected: Category["icon"];
	onSelect: (icon: Category["icon"]) => void;
};

const IconSearch = ({ onSearch }: { onSearch: (query: string) => void }) => (
	<div className="flex items-center gap-2">
		<Input
			type="search"
			aria-label="Search icons"
			placeholder="Search icons…"
			onChange={(event) => onSearch(event.currentTarget.value)}
		/>
		<PopoverClose aria-label="Close icon picker" render={<Button variant="ghost" size="icon" />}>
			<HugeiconsIcon icon={Cancel01Icon} aria-hidden />
		</PopoverClose>
	</div>
);

const IconGrid = ({ icons, selected, onSelect }: IconSelection & { icons: Category["icon"][] }) => (
	<div className="grid grid-cols-3 gap-1 overflow-y-auto sm:grid-cols-4">
		{icons.length === 0 && (
			<p role="status" className="col-span-full py-4 text-center text-muted-foreground">
				No matching icons.
			</p>
		)}
		{icons.map((icon) => (
			<PopoverClose
				key={icon}
				aria-pressed={icon === selected}
				onClick={() => onSelect(icon)}
				render={
					<Button
						variant={icon === selected ? "secondary" : "ghost"}
						className="h-14 min-w-0 flex-col gap-1 px-1 text-center text-xs whitespace-normal"
					/>
				}
			>
				<HugeiconsIcon icon={categoryIconOptions[icon].glyph} aria-hidden />
			</PopoverClose>
		))}
	</div>
);

const SearchableIconGrid = (selection: IconSelection) => {
	const [query, setQuery] = useState("");
	const [term, setTerm] = useState("");
	useEffect(() => {
		const timer = setTimeout(() => setTerm(query.trim().toLowerCase()), 300);
		return () => clearTimeout(timer);
	}, [query]);
	const icons = categoryIcons.filter((icon) =>
		`${categoryIconOptions[icon].label} ${icon}`.toLowerCase().includes(term),
	);
	return (
		<>
			<IconSearch onSearch={setQuery} />
			<IconGrid icons={icons} {...selection} />
		</>
	);
};

export const CategoryIconPicker = (selection: IconSelection) => (
	<PopoverContent
		align="start"
		sideOffset={6}
		className="max-h-(--available-height) w-84 max-w-[min(var(--available-width),calc(100vw-2rem))]"
	>
		<PopoverTitle className="sr-only">Choose a category icon</PopoverTitle>
		<SearchableIconGrid {...selection} />
	</PopoverContent>
);
