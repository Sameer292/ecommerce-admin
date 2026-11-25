import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RevenueChart } from "../src/features/overview/revenue-chart";

test("the revenue plot has one keyboard control and a readable data table", () => {
	const markup = renderToStaticMarkup(
		<RevenueChart
			points={[
				{ date: "2026-01-01", through: "2026-01-07", sales: 1500, partial: false },
				{ date: "2026-01-08", through: "2026-01-13", sales: 2500, partial: true },
			]}
			currency="USD"
		/>,
	);
	assert.equal(markup.match(/type="range"/g)?.length, 1);
	assert.match(markup, /aria-valuetext="Jan 1–Jan 7, \$15\.00"/);
	assert.match(markup, /Jan 8–Jan 13 \(partial\)/);
	assert.match(markup, /<span>Jan 13<\/span>/);
	assert.match(markup, /<summary[^>]*>View sales data<\/summary>/);
	assert.match(markup, /<td[^>]*>\$25\.00<\/td>/);
});
