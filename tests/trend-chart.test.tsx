import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TrendChart } from "../src/features/overview/trend-chart";

const points = [
	{
		date: "2026-01-01",
		through: "2026-01-07",
		sales: 1500,
		orders: 3,
		customers: 2,
		partial: false,
	},
	{
		date: "2026-01-08",
		through: "2026-01-13",
		sales: 2500,
		orders: 5,
		customers: 4,
		partial: true,
	},
];

test("the sales trend renders a shadcn chart with the weekly reporting period", () => {
	const markup = renderToStaticMarkup(<TrendChart points={points} currency="USD" metric="sales" />);
	assert.match(markup, /data-slot="chart"/);
	assert.match(markup, /class="recharts-responsive-container"/);
	assert.match(markup, /Paid sales over time/);
	assert.match(markup, /Jan 1, 2026–Jan 13, 2026/);
	assert.match(markup, /Totals by 7-day period/);
});

test("orders and customers show the selected metric and daily reporting period", () => {
	const day = [{ ...points[0], through: points[0].date }];
	for (const [metric, title] of [
		["orders", "Orders"],
		["customers", "New customers"],
	] as const) {
		const markup = renderToStaticMarkup(<TrendChart points={day} currency="USD" metric={metric} />);
		assert.match(markup, new RegExp(`<h2[^>]*>${title} over time</h2>`));
		assert.match(markup, /Daily totals/);
		assert.doesNotMatch(markup, /NaN/);
	}
});
