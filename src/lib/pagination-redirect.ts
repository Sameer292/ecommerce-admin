import { defaultStringifySearch, redirect } from "@tanstack/react-router";
import { clampPage } from "./pagination";

export const redirectInvalidPages = (
	pathname: string,
	search: {
		page: number;
		perPage?: number;
		activity?: number;
		activityPerPage?: number;
		payments?: number;
		paymentsPerPage?: number;
	},
	total: number,
	activityTotal?: number,
	paymentTotal?: number,
) => {
	const page = clampPage(search.page, total, search.perPage);
	const activity =
		activityTotal === undefined || search.activity === undefined
			? search.activity
			: clampPage(search.activity, activityTotal, search.activityPerPage);
	const payments =
		paymentTotal === undefined || search.payments === undefined
			? search.payments
			: clampPage(search.payments, paymentTotal, search.paymentsPerPage);
	if (page !== search.page || activity !== search.activity || payments !== search.payments) {
		throw redirect({
			href: pathname + defaultStringifySearch({ ...search, page, activity, payments }),
			replace: true,
		});
	}
};
