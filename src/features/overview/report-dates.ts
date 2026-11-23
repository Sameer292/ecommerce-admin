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
	const to = addDays(toDateKey(now, timeZone), 1);
	const days = range;
	return { from: addDays(to, -days * 2), currentFrom: addDays(to, -days), to, timeZone };
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
		let sales = 0;
		for (let day = offset; day < Math.min(offset + interval, days); day++) {
			sales += revenue.get(addDays(window.currentFrom, day)) ?? 0;
		}
		return { date: addDays(window.currentFrom, offset), sales };
	});
};
