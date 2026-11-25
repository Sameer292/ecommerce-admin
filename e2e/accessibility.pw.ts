import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./staff";

const checkAccessibility = async (page: Page) => {
	await page.evaluate(async () => {
		const animations = document.getAnimations().filter((animation) => {
			const timing = animation.effect?.getComputedTiming();
			return animation.playState === "running" && Number.isFinite(timing?.endTime);
		});
		await Promise.allSettled(animations.map((animation) => animation.finished));
	});
	const { violations } = await new AxeBuilder({ page })
		.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
		.analyze();
	expect(
		violations.map(({ id, nodes }) => ({
			id,
			elements: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
		})),
	).toEqual([]);
};

for (const theme of ["light", "dark"] as const) {
	test.describe(theme, () => {
		test.use({ colorScheme: theme });

		test("category icon popover and product deletion dialog meet automated checks", async ({
			page,
		}) => {
			await signIn(page, "/categories/new");
			await expect(page.locator("html")).toHaveClass(new RegExp(theme));
			await page.getByRole("button", { name: "Icon, Folder" }).click();
			await expect(page.getByRole("searchbox", { name: "Search icons" })).toBeVisible();
			await checkAccessibility(page);
			await page.goto("/products?q=Alpine");
			await page.getByRole("link", { name: /Alpine Travel Mug/ }).click();
			await page.getByRole("button", { name: "Delete", exact: true }).click();
			await expect(page.getByRole("dialog", { name: /Delete Alpine Travel Mug/ })).toBeVisible();
			await checkAccessibility(page);
		});
	});
}
