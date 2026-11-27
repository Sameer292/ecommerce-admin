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
	expect(html).toContain('<meta name="robots" content="index, follow"');
	expect(html).not.toContain('content="noindex, nofollow"');
	const robots = await request.get("/robots.txt");
	expect(robots.ok()).toBe(true);
	expect(await robots.text()).toContain("Allow: /");
	for (const path of ["/password/reset", "/?returnTo=%2Forders", "/orders"]) {
		const privatePage = await request.get(path);
		expect(await privatePage.text()).toContain('<meta name="robots" content="noindex, nofollow"');
	}
});

test("sign-in defers optional JavaScript and retains requests, navigation, and theme controls", async ({
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
	expect(scripts.filter((url) => /\/(select|select-field|axios)-[^/]+\.js/.test(url))).toEqual([]);
	await page.locator("form").evaluate((form: HTMLFormElement) => {
		form.noValidate = true;
		form.requestSubmit();
	});
	await expect(
		page.getByRole("alert").filter({ hasText: "Check the highlighted fields." }),
	).toBeVisible();
	await expect(page.getByRole("textbox", { name: "Email" })).toHaveAttribute(
		"aria-invalid",
		"true",
	);
	expect(scripts.some((url) => /\/axios-[^/]+\.js/.test(url))).toBe(true);
	const theme = page.getByRole("button", { name: "Toggle color theme" });
	const before = await page.locator("html").getAttribute("class");
	await theme.click();
	await expect(page.locator("html")).not.toHaveAttribute("class", before ?? "");
	await page.getByRole("link", { name: "Forgot password?" }).click();
	await expect(page).toHaveURL(/\/password\/reset$/);
	await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
	expect(errors).toEqual([]);
});
