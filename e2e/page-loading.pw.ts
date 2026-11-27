import { expect, test } from "@playwright/test";

test("initial HTML includes styles, font preloads, and staff metadata", async ({ request }) => {
	const response = await request.get("/");
	expect(response.ok()).toBe(true);
	const html = await response.text();
	expect(html).toMatch(/<style\b[^>]*>[\s\S]*--background:/);
	expect(html).not.toMatch(/<link\b[^>]*rel="stylesheet"/);
	for (const font of ["inter", "geist"]) {
		expect(html).toMatch(
			new RegExp(
				`<link(?=[^>]*rel="preload")(?=[^>]*as="font")(?=[^>]*crossorigin="anonymous")(?=[^>]*href="[^"]*${font}-latin-wght-normal)[^>]*>`,
				"i",
			),
		);
	}
	expect(html).toMatch(/<meta name="description" content="[^"]+"/);
	expect(html).toContain('<meta name="robots" content="noindex, nofollow"');
});

test("sign-in loads without dropdown JavaScript and retains navigation and theme controls", async ({
	page,
}) => {
	const scripts: string[] = [];
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	page.on("console", (message) => {
		if (message.type() === "error") errors.push(message.text());
	});
	page.on("request", (request) => {
		if (request.resourceType() === "script") scripts.push(request.url());
	});
	await page.goto("/");
	await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
	await expect(page.locator("html")).toHaveCSS("font-family", /Inter Variable/);
	expect(scripts.filter((url) => /\/(select|select-field)-[^/]+\.js/.test(url))).toEqual([]);
	const theme = page.getByRole("button", { name: "Toggle color theme" });
	const before = await page.locator("html").getAttribute("class");
	await theme.click();
	await expect(page.locator("html")).not.toHaveAttribute("class", before ?? "");
	await page.getByRole("link", { name: "Forgot password?" }).click();
	await expect(page).toHaveURL(/\/password\/reset$/);
	await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
	expect(errors).toEqual([]);
});
