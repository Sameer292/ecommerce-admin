import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useHydrated } from "@tanstack/react-router";
import { useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ListControlsProps, ListFormProps, ListSearch } from "./list.types";
import { filterKey, useFilterTimer, useListFormKey } from "./use-list-form";

const SearchField = ({
	query,
	placeholder,
	searchClassName = "sm:max-w-xs",
	action,
}: Pick<ListFormProps, "query" | "placeholder" | "searchClassName"> & { action?: ReactNode }) => (
	<div className={cn("relative min-w-40 flex-1", searchClassName)}>
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
			className={cn("pl-9", action && "max-md:pr-12")}
		/>
		{action && (
			<div className="absolute inset-y-0 right-0 flex items-center md:hidden">{action}</div>
		)}
	</div>
);

const ListForm = ({
	query,
	placeholder,
	searchClassName,
	mobileSearchAction,
	children,
	onSearch,
	onClear,
}: ListFormProps) => {
	const hydrated = useHydrated();
	const form = useRef<HTMLFormElement>(null);

	const { cancel, events } = useFilterTimer(onSearch);
	const applyFields = (fields: FormData) => {
		if (!form.current) return false;
		const values = new FormData(form.current);
		for (const [name, value] of fields) values.set(name, value);
		if (!onSearch(values, true)) return false;
		cancel();
		return true;
	};
	const clear = () => {
		cancel();
		onClear?.();
	};
	return (
		<search>
			<form ref={form} {...events}>
				<FieldSet disabled={!hydrated} className="min-w-0 flex-row flex-wrap items-center gap-2">
					<SearchField
						query={query}
						placeholder={placeholder}
						searchClassName={searchClassName}
						action={mobileSearchAction?.(applyFields)}
					/>
					{children}
					{onClear && (
						<Button variant="ghost" size="lg" type="button" onClick={clear}>
							Clear
						</Button>
					)}
				</FieldSet>
			</form>
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
	const apply = (form: FormData, external = false) => {
		const next = readSearch(form);
		if (!next) return false;
		const signature = filterKey(next);
		if (search.page === 1 && signature === (sent.current.at(-1) ?? applied)) return true;
		// The inline fields need to reload when a separate form applies new values.
		if (!external) sent.current.push(signature);
		onSearch({ ...next, sort: search.sort, perPage: search.perPage });
		return true;
	};
	return <ListForm key={key} query={search.q} onSearch={apply} onClear={onClear} {...props} />;
};
