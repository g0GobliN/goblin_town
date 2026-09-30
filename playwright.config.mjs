import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:4321",
    headless: true,
  },
  // Builds the Astro-native output (npm run build flattens dist for
  // Cloudflare Pages, which astro preview can't serve) then previews it.
  webServer: process.env.E2E_SERVER_URL
    ? undefined
    : {
        command: "npm run build:astro && npx astro preview --port 4321",
        url: "http://localhost:4321/",
        reuseExistingServer: true,
        timeout: 120_000,
      },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
