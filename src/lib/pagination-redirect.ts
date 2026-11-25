import { defaultStringifySearch, redirect } from "@tanstack/react-router";
import { clampPage } from "./pagination";

export const redirectInvalidPages = (
	pathname: string,
	search: { page: number; activity?: number },
	total: number,
	activityTotal?: number,
) => {
	const page = clampPage(search.page, total);
	const activity =
		activityTotal === undefined || search.activity === undefined
			? search.activity
			: clampPage(search.activity, activityTotal);
	if (page !== search.page || activity !== search.activity) {
		throw redirect({
			href: pathname + defaultStringifySearch({ ...search, page, activity }),
			replace: true,
		});
	}
};
