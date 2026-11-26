import { expect, type Page } from "@playwright/test";

export const signIn = async (page: Page, destination = "/", role: "ADMIN" | "VIEWER" = "ADMIN") => {
	const email = process.env[`E2E_${role}_EMAIL`];
	const password = process.env[`E2E_${role}_PASSWORD`];
	if (!email || !password)
		throw new Error(`Set the E2E_${role}_EMAIL and E2E_${role}_PASSWORD fixture credentials.`);
	await page.goto(destination);
	await page.locator("input[name=email]").fill(email);
	await page.locator("input[name=password]").fill(password);
	await page.getByRole("button", { name: "Sign in", exact: true }).click();
	await expect(page.getByRole("heading", { name: "Sign in" })).toHaveCount(0);
};
