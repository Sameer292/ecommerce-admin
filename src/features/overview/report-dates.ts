import type { DateWindow, ReportRange, RevenuePoint } from "./overview.types";

const toDateKey = (date: Date, timeZone: string) => {
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
	const parts = Object.fromEntries(
		formatter.formatToParts(date).map(({ type, value }) => [type, value]),
	);
	return `${parts.year}-${parts.month}-${parts.day}`;
};

export const addDays = (dateKey: string, days: number) => {
	const date = new Date(`${dateKey}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
};

export const daysBetween = (from: string, to: string) =>
	(Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;

export const reportWindow = (
	range: ReportRange,
	timeZone: string,
	now = new Date(),
): DateWindow => {
	const today = toDateKey(now, timeZone);
	const to = addDays(typeof range === "number" ? today : range.through, 1);
	const currentFrom = typeof range === "number" ? addDays(to, -range) : range.from;
	return {
		from: addDays(currentFrom, -daysBetween(currentFrom, to)),
		currentFrom,
		to,
		timeZone,
		today,
	};
};

export const reportDate = (dateKey: string) =>
	new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
		new Date(`${dateKey}T00:00:00Z`),
	);

export const buildTrend = (revenue: Map<string, number>, window: DateWindow): RevenuePoint[] => {
	const days = daysBetween(window.currentFrom, window.to);
	const interval = days > 30 ? 7 : 1;
	return Array.from({ length: Math.ceil(days / interval) }, (_, index) => {
		const offset = index * interval;
		const end = Math.min(offset + interval, days);
		const date = addDays(window.currentFrom, offset);
		const through = addDays(window.currentFrom, end - 1);
		let sales = 0;
		for (let day = offset; day < end; day++) {
			sales += revenue.get(addDays(window.currentFrom, day)) ?? 0;
		}
		return {
			date,
			through,
			sales,
			partial: end - offset < interval || (date <= window.today && window.today <= through),
		};
	});
};
