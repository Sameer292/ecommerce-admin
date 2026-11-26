import { type ComponentProps, useEffect, useRef, useState } from "react";
import type { ListSearch } from "./list.types";

export const filterKey = ({
	page: _page,
	sort: _sort,
	perPage: _perPage,
	...filters
}: ListSearch) => JSON.stringify(filters, Object.keys(filters).sort());

export const useListFormKey = (applied: string) => {
	const [key, setKey] = useState(0);
	const previous = useRef(applied);
	const sent = useRef<string[]>([]);
	useEffect(() => {
		if (previous.current === applied) return;
		previous.current = applied;
		const submitted = sent.current.lastIndexOf(applied);
		if (submitted >= 0) {
			// Keep focus and any newer edits when this form’s search resolves.
			sent.current.splice(0, submitted + 1);
		} else {
			sent.current = [];
			setKey((key) => key + 1);
		}
	}, [applied]);
	return { key, sent };
};

const filterFormEvents = (schedule: (form: HTMLFormElement) => void, cancel: () => void) =>
	({
		onSubmit: (event) => {
			event.preventDefault();
			schedule(event.currentTarget);
		},
		onCompositionStart: cancel,
		onCompositionEnd: (event) => schedule(event.currentTarget),
		onChange: (event) => {
			if (!(event.nativeEvent instanceof InputEvent && event.nativeEvent.isComposing)) {
				schedule(event.currentTarget);
			}
		},
	}) satisfies Pick<
		ComponentProps<"form">,
		"onSubmit" | "onCompositionStart" | "onCompositionEnd" | "onChange"
	>;

export const useFilterTimer = (apply: (form: FormData) => void) => {
	const latestApply = useRef(apply);
	useEffect(() => {
		latestApply.current = apply;
	}, [apply]);
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const cancel = () => clearTimeout(timer.current);
	useEffect(() => () => clearTimeout(timer.current), []);

	const schedule = (form: HTMLFormElement) => {
		cancel();
		timer.current = setTimeout(() => {
			if (form.isConnected && form.checkValidity()) latestApply.current(new FormData(form));
		}, 300);
	};
	return { cancel, events: filterFormEvents(schedule, cancel) };
};
