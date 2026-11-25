import { defineConfig } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const app = new URL(baseURL);
if (app.hostname !== "localhost" && app.hostname !== "127.0.0.1") {
	throw new Error("Use a local app with disposable browser test data.");
}

export default defineConfig({
	testDir: ".",
	testMatch: "**/*.pw.ts",
	forbidOnly: Boolean(process.env.CI),
	outputDir: "../test-results",
	use: {
		baseURL,
		browserName: "chromium",
		launchOptions: { executablePath: process.env.E2E_CHROMIUM_PATH },
		trace: "off",
	},
	webServer:
		process.env.E2E_START_APP === "1"
			? {
					command: "bun run start",
					cwd: "..",
					url: baseURL,
					env: { HOST: "127.0.0.1", PORT: app.port || "80" },
					reuseExistingServer: false,
				}
			: undefined,
});
