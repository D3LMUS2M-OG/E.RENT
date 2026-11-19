import { defineConfig, devices } from "@playwright/test";

// Run against a running site: BASE_URL=https://your-preview.vercel.app npm run e2e   (defaults to a local `npm run dev`)
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: process.env.BASE_URL ?? "http://localhost:3000", trace: "retain-on-failure" },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }, { name: "phone", use: { ...devices["Pixel 7"] } }],
  webServer: process.env.BASE_URL ? undefined : { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
});
