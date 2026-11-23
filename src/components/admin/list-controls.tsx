import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { FormEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ListControlsProps = {
	query: string;
	placeholder: string;
	children?: ReactNode;
	onSearch: (data: FormData) => void;
	onClear?: () => void;
};

const SearchField = ({ query, placeholder }: Pick<ListControlsProps, "query" | "placeholder">) => (
	<div className="relative min-w-40 flex-1 sm:max-w-xs">
		<HugeiconsIcon
			icon={Search01Icon}
			className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground"
			aria-hidden
		/>
		<Input
			name="q"
			type="search"
			aria-label={placeholder}
			placeholder={placeholder}
			defaultValue={query}
			maxLength={100}
			className="h-9 pl-9"
		/>
	</div>
);

export const ListControls = ({
	query,
	placeholder,
	children,
	onSearch,
	onClear,
}: ListControlsProps) => {
	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onSearch(new FormData(event.currentTarget));
	};
	return (
		<search>
			<form className="flex flex-wrap items-center gap-2" onSubmit={submit}>
				<SearchField query={query} placeholder={placeholder} />
				{children}
				<Button variant="outline" size="lg" type="submit">
					Search
				</Button>
				{onClear && (
					<Button variant="ghost" size="lg" type="button" onClick={onClear}>
						Clear
					</Button>
				)}
			</form>
		</search>
	);
};
