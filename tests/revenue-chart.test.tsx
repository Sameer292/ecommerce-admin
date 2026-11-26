import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RevenueChart } from "../src/features/overview/revenue-chart";

test("the revenue plot has one keyboard control and a readable data table", () => {
	const markup = renderToStaticMarkup(
		<RevenueChart
			points={[
				{ date: "2026-01-01", sales: 1500 },
				{ date: "2026-01-02", sales: 2500 },
			]}
			currency="USD"
			range={7}
		/>,
	);
	assert.equal(markup.match(/type="range"/g)?.length, 1);
	assert.match(markup, /aria-valuetext="Jan 1, \$15\.00"/);
	assert.match(markup, /<summary[^>]*>View sales data<\/summary>/);
	assert.match(markup, /<td[^>]*>\$25\.00<\/td>/);
});
