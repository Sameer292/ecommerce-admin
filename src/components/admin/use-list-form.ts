import { type ComponentProps, useEffect, useRef, useState } from "react";
import type { ListSearch } from "./list.types";

export const filterKey = ({ page: _page, ...filters }: ListSearch) => JSON.stringify(filters);

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

export const useFilterTimer = (apply: (form: FormData) => void) => {
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const cancel = () => clearTimeout(timer.current);
	useEffect(() => () => clearTimeout(timer.current), []);

	const schedule = (form: HTMLFormElement) => {
		cancel();
		timer.current = setTimeout(() => {
			if (form.isConnected && form.checkValidity()) apply(new FormData(form));
		}, 300);
	};
	const events = {
		onSubmit: (event) => event.preventDefault(),
		onCompositionStart: cancel,
		onCompositionEnd: (event) => schedule(event.currentTarget),
		onChange: (event) => {
			if (!(event.nativeEvent instanceof InputEvent && event.nativeEvent.isComposing)) {
				schedule(event.currentTarget);
			}
		},
	} satisfies Pick<
		ComponentProps<"form">,
		"onSubmit" | "onCompositionStart" | "onCompositionEnd" | "onChange"
	>;
	return { cancel, events };
};
