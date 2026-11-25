import type { DateWindow, OverviewRange, RevenuePoint } from "./overview.types";

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

export const reportWindow = (
	range: OverviewRange,
	timeZone: string,
	now = new Date(),
): DateWindow => {
	const today = toDateKey(now, timeZone);
	const to = addDays(today, 1);
	const days = range;
	return { from: addDays(to, -days * 2), currentFrom: addDays(to, -days), to, timeZone, today };
};

export const reportDate = (dateKey: string) =>
	new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
		new Date(`${dateKey}T00:00:00Z`),
	);

export const buildTrend = (
	revenue: Map<string, number>,
	window: DateWindow,
	range: OverviewRange,
): RevenuePoint[] => {
	const days = range;
	const interval = range === 90 ? 7 : 1;
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
