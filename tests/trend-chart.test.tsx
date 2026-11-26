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

test("the sales trend renders a shadcn chart and formatted data table", () => {
	const markup = renderToStaticMarkup(<TrendChart points={points} currency="USD" metric="sales" />);
	assert.match(markup, /data-slot="chart"/);
	assert.match(markup, /class="recharts-responsive-container"/);
	assert.match(markup, /Jan 1–Jan 7/);
	assert.match(markup, /Jan 8–Jan 13 \(partial\)/);
	assert.match(markup, /<summary[^>]*>View chart data<\/summary>/);
	assert.match(markup, /<td[^>]*>\$25\.00<\/td>/);
});

test("orders and customers render their own counts for a single day", () => {
	const day = [{ ...points[0], through: points[0].date }];
	for (const [metric, value] of [
		["orders", 3],
		["customers", 2],
	] as const) {
		const markup = renderToStaticMarkup(<TrendChart points={day} currency="USD" metric={metric} />);
		assert.match(markup, new RegExp(`<td[^>]*>${value}</td>`));
		assert.match(markup, /Daily totals/);
		assert.doesNotMatch(markup, /NaN/);
	}
});
