import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useHydrated, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ListControlsProps, ListFormProps, ListSearch } from "./list.types";
import { filterKey, useFilterTimer, useListFormKey } from "./use-list-form";

const SearchField = ({ query, placeholder }: Pick<ListFormProps, "query" | "placeholder">) => (
	<div className="relative min-w-40 flex-1 sm:max-w-xs">
		<HugeiconsIcon
			icon={Search01Icon}
			className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 size-4 text-muted-foreground"
			aria-hidden
		/>
		<Input
			name="q"
			type="search"
			aria-label={placeholder}
			placeholder={placeholder}
			defaultValue={query}
			maxLength={100}
			className="pl-9"
		/>
	</div>
);

const ListForm = ({ query, placeholder, children, onSearch, onClear }: ListFormProps) => {
	const hydrated = useHydrated();
	const updating = useRouterState({
		select: ({ status, location, resolvedLocation }) =>
			status === "pending" && location.pathname === resolvedLocation?.pathname,
	});
	const { cancel, events } = useFilterTimer(onSearch);
	const clear = () => {
		cancel();
		onClear?.();
	};
	return (
		<search>
			<form {...events}>
				<FieldSet disabled={!hydrated} className="min-w-0 flex-row flex-wrap items-center gap-2">
					<SearchField query={query} placeholder={placeholder} />
					{children}
					{onClear && (
						<Button variant="ghost" size="lg" type="button" onClick={clear}>
							Clear
						</Button>
					)}
				</FieldSet>
			</form>
			<p role="status" className={updating ? "mt-2 text-sm text-muted-foreground" : "sr-only"}>
				{updating ? "Updating results…" : ""}
			</p>
		</search>
	);
};

export const ListControls = <Search extends ListSearch>({
	search,
	readSearch,
	onSearch,
	onClear,
	...props
}: ListControlsProps<Search>) => {
	const applied = filterKey(search);
	const { key, sent } = useListFormKey(applied);
	const apply = (form: FormData) => {
		const next = readSearch(form);
		if (!next) return;
		const signature = filterKey(next);
		if (search.page === 1 && signature === (sent.current.at(-1) ?? applied)) return;
		sent.current.push(signature);
		onSearch({ ...next, sort: search.sort, perPage: search.perPage });
	};
	return <ListForm key={key} query={search.q} onSearch={apply} onClear={onClear} {...props} />;
};
